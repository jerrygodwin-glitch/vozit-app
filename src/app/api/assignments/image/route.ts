// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'

// POST /api/assignments/image — upload image and link to assignment
export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('image') as File | null
  const assignmentId = formData.get('assignment_id') as string | null

  if (!file) return NextResponse.json({ error: 'No image file provided' }, { status: 400 })
  if (!assignmentId) return NextResponse.json({ error: 'assignment_id required' }, { status: 400 })

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Only JPEG, PNG, and WebP images allowed' }, { status: 400 })
  }

  // Validate file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Image must be under 5MB' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verify user is the assignment creator or a contributor
  const { data: assignment } = await admin
    .from('assignments')
    .select('id, created_by, image_url')
    .eq('id', assignmentId)
    .single()

  if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })

  const isCreator = assignment.created_by === user.id
  if (!isCreator) {
    // Check if contributor
    const { data: contrib } = await admin
      .from('assignment_contributors')
      .select('id')
      .eq('assignment_id', assignmentId)
      .eq('user_id', user.id)
      .single()
    if (!contrib) {
      return NextResponse.json({ error: 'Only the creator or contributors can add images' }, { status: 403 })
    }
  }

  // Delete old image if replacing
  if (assignment.image_url) {
    const oldPath = assignment.image_url.split('/assignment-images/')[1]
    if (oldPath) {
      await admin.storage.from('assignment-images').remove([oldPath])
    }
  }

  // Upload to Supabase Storage
  const ext = file.name.split('.').pop() ?? 'jpg'
  const filename = `${user.id}/${assignmentId}-${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await admin.storage
    .from('assignment-images')
    .upload(filename, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    return NextResponse.json({ error: 'Upload failed: ' + uploadError.message }, { status: 500 })
  }

  // Get public URL
  const { data: urlData } = admin.storage
    .from('assignment-images')
    .getPublicUrl(filename)

  const imageUrl = urlData.publicUrl

  // Update assignment record
  const { error: updateError } = await admin
    .from('assignments')
    .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
    .eq('id', assignmentId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ image_url: imageUrl }, { status: 200 })
}

// DELETE /api/assignments/image — remove image from assignment
export async function DELETE(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { assignment_id } = await req.json()
  if (!assignment_id) return NextResponse.json({ error: 'assignment_id required' }, { status: 400 })

  const admin = createAdminClient()

  const { data: assignment } = await admin
    .from('assignments')
    .select('id, created_by, image_url')
    .eq('id', assignment_id)
    .single()

  if (!assignment) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (assignment.created_by !== user.id) {
    return NextResponse.json({ error: 'Only the creator can remove the image' }, { status: 403 })
  }

  if (assignment.image_url) {
    const path = assignment.image_url.split('/assignment-images/')[1]
    if (path) await admin.storage.from('assignment-images').remove([path])
  }

  await admin.from('assignments').update({ image_url: null }).eq('id', assignment_id)

  return NextResponse.json({ ok: true })
}
export const dynamic = 'force-dynamic'
