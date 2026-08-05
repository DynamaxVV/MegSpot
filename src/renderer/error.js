import Vue from 'vue'
import { getOperationId, logDiagnosticError } from '@/utils/diagnosticLog'

const getRuntimeContext = () => ({
  operationId: getOperationId(),
  route: typeof window !== 'undefined' ? window.location.href : ''
})

Vue.config.errorHandler = function (err, vm, info) {
  logDiagnosticError('runtime', 'vue_error', err, getRuntimeContext(), {
    info,
    component: vm?.$options?.name || vm?.$options?._componentTag || 'anonymous'
  })
  Vue.nextTick(() => {
    if (process.env.NODE_ENV === 'development') {
      console.group('%c >>>>>> 错误信息 >>>>>>', 'color:red')
      console.log(`%c ${info}`, 'color:blue')
      console.groupEnd()
      console.group('%c >>>>>> 发生错误的Vue 实例对象 >>>>>>', 'color:green')
      console.log(vm)
      console.groupEnd()
      console.group('%c >>>>>> 发生错误的原因及位置 >>>>>>', 'color:red')
      console.error(err)
      console.groupEnd()
    }
  })
}

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    logDiagnosticError('runtime', 'window_error', event.error || event.message, getRuntimeContext(), {
      source: event.filename,
      line: event.lineno,
      column: event.colno
    })
  })
  window.addEventListener('unhandledrejection', (event) => {
    logDiagnosticError('runtime', 'unhandled_rejection', event.reason, getRuntimeContext())
  })
}
