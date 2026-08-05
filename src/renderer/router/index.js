import Vue from 'vue'
import Router from 'vue-router'
import Performance from '@/tools/performance'
import store from '../store'
// 引入路由表
import routes from './routes'
import { createOperationId, getOperationId, logDiagnosticError, logDiagnosticEvent, setOperationId } from '@/utils/diagnosticLog'

const originalPush = Router.prototype.push
Router.prototype.push = function push(location) {
  return originalPush.call(this, location).catch((err) => {
    logDiagnosticError('route', 'route_push_failed', err, { operationId: getOperationId() }, {
      location: typeof location === 'string' ? location : location?.path
    })
    return err
  })
}
Vue.use(Router)
const router = new Router({
  scrollBehavior: () => ({ y: 0 }),
  routes: routes
})

var end = null
const routeStartedAt = new Map()
router.beforeEach((to, from, next) => {
  if (to.name === 'image-compare' && to.query.pairTask === '1') {
    setOperationId(createOperationId())
  }
  routeStartedAt.set(to.fullPath, Date.now())
  logDiagnosticEvent('route', 'route_start', {
    operationId: getOperationId(),
    route: to.fullPath
  }, { from: from.fullPath })
  end = Performance.startExecute(`${from.path} => ${to.path} 路由耗时`) // 路由性能监控
  const done = end
  setTimeout(() => {
    done()
  }, 0)
  next()
})

router.afterEach((to, from) => {
  logDiagnosticEvent('route', 'route_ready', {
    operationId: getOperationId(),
    route: to.fullPath
  }, {
    from: from.fullPath,
    durationMs: Date.now() - (routeStartedAt.get(to.fullPath) || Date.now())
  })
  routeStartedAt.delete(to.fullPath)
  // clear tmp collections
  if (!['image-compare', 'video-compare'].includes(to.name)) {
    store.dispatch('imageStore/removeTmpCollection')
    store.dispatch('videoStore/removeTmpCollection')
  }
})

router.onError((error) => {
  logDiagnosticError('route', 'route_failed', error, { operationId: getOperationId() })
})
export default router
