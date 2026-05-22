jest.mock('axios', () => {
  const post = jest.fn()
  const get = jest.fn()

  return {
    __esModule: true,
    default: {
      create: jest.fn(() => ({ post, get })),
    },
    post,
    get,
  }
})

describe('aiGenerate', () => {
  const ORIGINAL_ENV = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = {
      ...ORIGINAL_ENV,
      AI_SERVICE_URL: 'http://localhost:8000',
      AI_SERVICE_TIMEOUT: '15000',
    }
  })

  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  it('posts to the requested concrete AI-service route', async () => {
    const axiosModule = await import('axios')
    const mockedCreate = axiosModule.default.create as jest.Mock
    const client = { post: jest.fn(), get: jest.fn() }
    mockedCreate.mockReturnValue(client)
    client.post.mockResolvedValue({ data: { ok: true } })

    const { aiGenerate } = await import('./ai.service')
    const result = await aiGenerate({
      route: '/api/deck/generate-complete',
      payload: { topic: 'Fractions' },
    })

    expect(client.post).toHaveBeenCalledWith('/api/deck/generate-complete', { topic: 'Fractions' })
    expect(result).toEqual({
      success: true,
      data: { ok: true },
    })
  })

  it('returns a failure when no concrete AI-service route is provided', async () => {
    const { aiGenerate } = await import('./ai.service')

    const result = await aiGenerate({ payload: { topic: 'Fractions' } })

    expect(result).toEqual({
      success: false,
      message: 'AI route is required',
    })
  })
})

describe('aiGenerateBinary', () => {
  const ORIGINAL_ENV = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = {
      ...ORIGINAL_ENV,
      AI_SERVICE_URL: 'http://localhost:8000',
      AI_SERVICE_TIMEOUT: '15000',
    }
  })

  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  it('requests binary data from the requested concrete AI-service route', async () => {
    const axiosModule = await import('axios')
    const mockedCreate = axiosModule.default.create as jest.Mock
    const client = { post: jest.fn(), get: jest.fn() }
    mockedCreate.mockReturnValue(client)
    client.post.mockResolvedValue({
      data: Buffer.from('pptx'),
      headers: {
        'content-type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'content-disposition': 'attachment; filename=test.pptx',
      },
    })

    const { aiGenerateBinary } = await import('./ai.service')
    const result = await aiGenerateBinary({
      route: '/api/deck/generate-deck-pptx',
      payload: { topic: 'Fractions' },
    })

    expect(client.post).toHaveBeenCalledWith(
      '/api/deck/generate-deck-pptx',
      { topic: 'Fractions' },
      { responseType: 'arraybuffer' }
    )
    expect(result.success).toBe(true)
    expect(result.data).toBeInstanceOf(Buffer)
    expect(result.headers).toEqual({
      'content-type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'content-disposition': 'attachment; filename=test.pptx',
    })
  })
})
