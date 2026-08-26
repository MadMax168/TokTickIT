import cors from 'cors'
import express from 'express'
import prisma from './prisma'

const app = express()
app.use(cors())
app.use(express.json())

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
