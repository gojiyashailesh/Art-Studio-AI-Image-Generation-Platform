import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createJob,
  getJob,
  subscribeToJob,
  uploadHeadshot,
} from '../api.js'

const POLL_MS = 2500
const STYLE_OPTIONS = [
  {
    key: 'bold',
    title: 'Bold',
    icon: 'B',
    description: 'High contrast, vibrant color, strong impact.',
  },
  {
    key: 'realistic',
    title: 'Realistic',
    icon: 'R',
    description: 'Natural lighting, lifelike creator focus.',
  },
  {
    key: 'minimal',
    title: 'Minimal',
    icon: 'M',
    description: 'Clean layout, simple shapes, focused message.',
  },
]

const COUNT_OPTIONS = [1, 2, 3]

function pickPreviewSrc(thumbnail) {
  const variants = thumbnail.variants
  if (variants && typeof variants === 'object') {
    if (variants.youtube) return variants.youtube
    if (variants.square) return variants.square
  }
  if (thumbnail.imagekit_url) return thumbnail.imagekit_url
  return ''
}

function getInitials(user) {
  if (!user?.name) return 'AI'
  return user.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

export function ThumbnailStudioPage({ authToken, currentUser }) {
  const [prompt, setPrompt] = useState(
    'Tech creator reacting to a surprising coding tip',
  )
  const [numThumbnails, setNumThumbnails] = useState(2)
  const [headshotFile, setHeadshotFile] = useState(null)
  const [headshotUrl, setHeadshotUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [jobId, setJobId] = useState('')
  const [jobStatus, setJobStatus] = useState('')
  const [message, setMessage] = useState('')
  const [thumbnails, setThumbnails] = useState([])
  const [headshotPreview, setHeadshotPreview] = useState(null)
  const eventSourceRef = useRef(null)
  const includedStyles = STYLE_OPTIONS.slice(0, numThumbnails)
  const uploadedThumbnails = thumbnails.filter(
    (thumbnail) => thumbnail.status === 'uploaded' && pickPreviewSrc(thumbnail),
  )
  const previewStyles =
    uploadedThumbnails.length > 0 ? uploadedThumbnails : includedStyles

  const resetSession = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setJobId('')
    setJobStatus('')
    setThumbnails([])
    setMessage('')
    setGenerating(false)
  }, [])

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close()
    }
  }, [])

  const handleUpload = async () => {
    if (!headshotFile) {
      setMessage('Choose a headshot image first.')
      return
    }

    setUploading(true)
    setMessage('')

    try {
      const { url } = await uploadHeadshot(headshotFile, authToken)
      setHeadshotUrl(url)
      setMessage('Headshot uploaded. You can generate thumbnails.')
    } catch (error) {
      setMessage(error.message || 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const mergeThumbnail = useCallback((incoming) => {
    setThumbnails((previous) => {
      const next = [...previous]
      const index = next.findIndex((thumbnail) => thumbnail.id === incoming.id)
      if (index >= 0) {
        next[index] = { ...next[index], ...incoming }
      } else {
        next.push({ ...incoming })
      }
      return next
    })
  }, [])

  const pollJob = useCallback(
    async (id) => {
      try {
        const job = await getJob(id, authToken)
        setJobStatus(job.status)
        for (const thumbnail of job.thumbnails) {
          mergeThumbnail({
            id: thumbnail.id,
            style_name: thumbnail.style_name,
            status: thumbnail.status,
            imagekit_url: thumbnail.imagekit_url,
            error_message: thumbnail.error_message,
            variants: thumbnail.variants,
          })
        }
      } catch (error) {
        setMessage(error.message || 'Polling failed.')
      }
    },
    [authToken, mergeThumbnail],
  )

  useEffect(() => {
    if (!jobId || !generating) return undefined

    const timerId = window.setInterval(() => {
      void pollJob(jobId)
    }, POLL_MS)

    return () => window.clearInterval(timerId)
  }, [jobId, generating, pollJob])

  const handleGenerate = async () => {
    if (!headshotUrl) {
      setMessage('Upload a headshot first.')
      return
    }
    if (!prompt.trim()) {
      setMessage('Enter a prompt.')
      return
    }

    resetSession()
    setGenerating(true)
    setMessage('Starting job...')

    try {
      const { job_id: nextJobId } = await createJob(
        prompt.trim(),
        numThumbnails,
        headshotUrl,
        authToken,
      )
      setJobId(nextJobId)
      await pollJob(nextJobId)

      eventSourceRef.current = subscribeToJob(
        nextJobId,
        {
          onThumbnailReady: (data) => {
            mergeThumbnail({
              id: data.thumbnail_id,
              style_name: data.style_name,
              status: 'uploaded',
              imagekit_url: data.imagekit_url,
              variants: data.variants,
            })
          },
          onThumbnailFailed: (data) => {
            mergeThumbnail({
              id: data.thumbnail_id,
              style_name: data.style_name,
              status: 'failed',
              error_message: data.error_message,
            })
          },
          onJobCompleted: () => {
            setJobStatus('completed')
            setMessage('Job finished.')
            setGenerating(false)
            void pollJob(nextJobId)
          },
          onStreamError: (data) => {
            setMessage(data?.error || 'Stream error - still polling for updates.')
          },
        },
        authToken,
      )
    } catch (error) {
      setMessage(error.message || 'Failed to start job.')
      setGenerating(false)
    }
  }

  return (
    <div className="studio-page">
      <div className="studio-workspace">
        <section className="builder-panel" aria-label="Thumbnail generator form">
          <div className="builder-step">
            <span className="builder-step__number">1</span>
            <div className="builder-step__content">
              <div className="builder-step__head">
                <h2 className="builder-step__title">Upload your headshot</h2>
                <p className="builder-step__hint">Clear, front-facing photos work best.</p>
              </div>

              <div className="headshot-grid">
                <div className="upload-row">
                  <input
                    id="headshot-file"
                    className="file-input"
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      setHeadshotFile(file || null)
                      setHeadshotUrl('')

                      if (!file) {
                        setHeadshotPreview(null)
                        return
                      }

                      const reader = new FileReader()
                      reader.onload = () => setHeadshotPreview(reader.result)
                      reader.readAsDataURL(file)
                    }}
                  />
                  <label className="file-picker" htmlFor="headshot-file">
                    <span className="file-picker__icon" aria-hidden="true">
                      ^
                    </span>
                    <span className="file-picker__copy">
                      <span className="file-picker__title">
                        {headshotFile ? 'Headshot selected' : 'Click to upload'}
                      </span>
                      <span className="file-picker__name">
                        {headshotFile ? headshotFile.name : 'PNG, JPG, or WebP'}
                      </span>
                    </span>
                  </label>
                  <button
                    type="button"
                    className="btn upload-btn"
                    disabled={uploading || !headshotFile}
                    onClick={() => void handleUpload()}
                  >
                    {uploading ? 'Uploading...' : headshotUrl ? 'Uploaded' : 'Upload'}
                  </button>
                </div>

                <div className="headshot-preview">
                  {headshotPreview ? (
                    <img src={headshotPreview} alt="Selected headshot" />
                  ) : (
                    <span aria-hidden="true">ID</span>
                  )}
                  {headshotUrl && (
                    <span className="headshot-preview__status" aria-label="Uploaded">
                      OK
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="builder-step">
            <span className="builder-step__number">2</span>
            <div className="builder-step__content">
              <div className="builder-step__head">
                <h2 className="builder-step__title">Describe your thumbnail idea</h2>
                <p className="builder-step__hint">What is the hook or core reaction?</p>
              </div>
              <textarea
                className="textarea studio-textarea"
                rows={4}
                maxLength={500}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
              />
              <span className="prompt-count">{prompt.length}/500</span>
            </div>
          </div>

          <div className="builder-step">
            <span className="builder-step__number">3</span>
            <div className="builder-step__content">
              <div className="builder-step__head">
                <h2 className="builder-step__title">How many variants?</h2>
                <p className="builder-step__hint">Choose the number of thumbnails to generate.</p>
              </div>
              <div className="count-options" role="group" aria-label="Number of variants">
                {COUNT_OPTIONS.map((count) => (
                  <button
                    key={count}
                    type="button"
                    className={`count-option${
                      numThumbnails === count ? ' is-active' : ''
                    }`}
                    onClick={() => setNumThumbnails(count)}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="builder-step">
            <span className="builder-step__number">4</span>
            <div className="builder-step__content">
              <div className="builder-step__head">
                <h2 className="builder-step__title">Styles in this run</h2>
                <p className="builder-step__hint">Variants are generated in this order.</p>
              </div>
              <div className="style-options">
                {STYLE_OPTIONS.map((style, index) => {
                  const isIncluded = index < numThumbnails
                  return (
                    <article
                      key={style.key}
                      className={`style-card${isIncluded ? ' is-active' : ''}`}
                    >
                      <span className="style-card__icon">{style.icon}</span>
                      <h3>{style.title}</h3>
                      <p>{style.description}</p>
                    </article>
                  )
                })}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="generate-button"
            disabled={generating || !headshotUrl || !prompt.trim()}
            onClick={() => void handleGenerate()}
          >
            {generating ? 'Generating thumbnails...' : 'Generate thumbnails'}
          </button>

          {jobId && (
            <p className="studio-meta">
              Job <code>{jobId.slice(0, 8)}...</code>
              {jobStatus && ` · ${jobStatus}`}
            </p>
          )}
          {message && <p className="notice studio-notice">{message}</p>}
        </section>

        <aside className="preview-panel" aria-label="Live thumbnail preview">
          <div className="preview-panel__head">
            <div>
              <span className="live-dot" aria-hidden="true" />
              <strong>Live preview</strong>
            </div>
            <span>AI-generated thumbnails</span>
          </div>

          <div className="thumbnail-stack">
            {previewStyles.map((item, index) => {
              const src = 'status' in item ? pickPreviewSrc(item) : ''
              const title = 'style_name' in item ? item.style_name : item.title
              return (
                <article
                  key={'id' in item ? item.id : item.key}
                  className={`thumbnail-preview thumbnail-preview--${index + 1}`}
                >
                  {src ? (
                    <img src={src} alt={title} />
                  ) : (
                    <div className="thumbnail-preview__placeholder">
                      <span>{index === 0 ? 'This code tip' : 'Simple trick'}</span>
                      <strong>{index === 0 ? 'changed everything' : 'big impact'}</strong>
                    </div>
                  )}
                  <span className="thumbnail-preview__tag">{title}</span>
                </article>
              )
            })}
          </div>

          {thumbnails.some((thumbnail) => thumbnail.status === 'failed') && (
            <div className="preview-errors">
              {thumbnails
                .filter((thumbnail) => thumbnail.status === 'failed')
                .map((thumbnail) => (
                  <p key={thumbnail.id}>
                    {thumbnail.style_name}: {thumbnail.error_message || 'Failed'}
                  </p>
                ))}
            </div>
          )}

          <p className="preview-panel__foot">
            Previews are examples. Your final results may vary.
          </p>
        </aside>
      </div>
    </div>
  )
}
