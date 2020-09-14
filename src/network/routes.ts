import { Application } from 'express'
import { Home } from '../routes/home'

// const routers = []

const applyRoutes = (app: Application): void => {
  app.use('/', Home)
  // routers.forEach((router: Router): Application => app.use('/api', router))
}

export { applyRoutes }
