import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const BUCKET = 'trip-photos'

function readDimensions(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(url) }
    img.onerror = () => { resolve({ width: null, height: null }); URL.revokeObjectURL(url) }
    img.src = url
  })
}

// Photos live in the private trip-photos bucket under <trip_id>/…; rows in trip_photos.
export function usePhotos(tripId, userId) {
  const [photos, setPhotos] = useState(null)
  const [error, setError] = useState(null)
  const [uploading, setUploading] = useState(0)

  const load = useCallback(async () => {
    if (!tripId) { setPhotos([]); return }
    setError(null)
    const { data, error } = await supabase.from('trip_photos').select('*').eq('trip_id', tripId).order('created_at', { ascending: false })
    if (error) { setError(error); setPhotos([]); return }
    const rows = data || []
    if (rows.length === 0) { setPhotos([]); return }
    const { data: signed, error: sErr } = await supabase.storage.from(BUCKET).createSignedUrls(rows.map((r) => r.storage_path), 3600)
    if (sErr) { setError(sErr); setPhotos(rows.map((r) => ({ ...r, url: null }))); return }
    setPhotos(rows.map((r, i) => ({ ...r, url: signed?.[i]?.signedUrl ?? null })))
  }, [tripId])
  useEffect(() => { load() }, [load])

  const upload = useCallback(async (files) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (!list.length) throw new Error('Pick an image file.')
    setUploading((n) => n + list.length)
    const failures = []
    for (const file of list) {
      try {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
        const path = `${tripId}/${crypto.randomUUID()}.${ext}`
        const dims = await readDimensions(file)
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false })
        if (upErr) throw upErr
        const { error: rowErr } = await supabase.from('trip_photos').insert({ trip_id: tripId, storage_path: path, uploaded_by: userId, ...dims })
        if (rowErr) throw rowErr
      } catch (err) { console.error(err); failures.push(file.name) }
      finally { setUploading((n) => n - 1) }
    }
    await load()
    if (failures.length) throw new Error(`${failures.length} of ${list.length} photo${list.length === 1 ? '' : 's'} didn’t upload.`)
  }, [tripId, userId, load])

  return { photos, loading: photos === null, error, reload: load, upload, uploading }
}
