import cors from 'cors'
import express from 'express'
import prisma from './prisma'

const app = express()
app.use(cors())
app.use(express.json())

function referenceDataFailure(response: express.Response, error: unknown) {
  const code = error instanceof Error && 'code' in error ? String(error.code) : undefined
  const unavailable = code === 'P1001' || code === 'ECONNREFUSED'

  response.status(unavailable ? 503 : 500).json({
    error: {
      code: unavailable ? 'REFERENCE_DATA_UNAVAILABLE' : 'REFERENCE_DATA_FAILED',
      message: unavailable
        ? 'Development Requester reference data is unavailable.'
        : 'Development Requester reference data could not be loaded.',
    },
  })
}

app.get('/api/development-requesters', async (_request, response) => {
  try {
    const requesters = await prisma.developmentRequester.findMany({
      where: { active: true },
      orderBy: { id: 'asc' },
      select: { id: true, name: true, email: true },
    })

    response.status(200).json({ items: requesters })
  } catch (error) {
    referenceDataFailure(response, error)
  }
})

app.get('/api/categories', async (_request, response) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, name: true },
    })

    response.json(categories)
  } catch (error) {
    console.error('Unable to load request categories', error)
    response.status(503).json({ error: 'Categories service is unavailable' })
  }
})

app.get('/api/health', (_request, response) => {
  response.status(200).json({ status: 'ok', service: 'TokTickIT API' })
})

export default app
