import cors from 'cors'
import express from 'express'
import prisma from './prisma'

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/categories', async (_request, response) => {
  const categories = await prisma.category.findMany({
    orderBy: { id: 'asc' },
    select: { id: true, name: true },
  })

  response.json(categories)
})

app.get('/api/health', (_request, response) => {
  response.status(200).json({ status: 'ok', service: 'TokTickIT API' })
})

export default app
