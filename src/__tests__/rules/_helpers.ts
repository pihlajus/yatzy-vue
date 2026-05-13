import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import fs from 'node:fs'
import path from 'node:path'

let env: RulesTestEnvironment | null = null

async function createEnv(): Promise<RulesTestEnvironment> {
  const inner = await initializeTestEnvironment({
    projectId: 'yatzy-rules-test',
    firestore: {
      rules: fs.readFileSync(path.resolve('firestore.rules'), 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  })
  return new Proxy(inner, {
    get(target, prop) {
      if (prop === 'cleanup') {
        return async () => {
          env = null
          return target.cleanup()
        }
      }
      const val = (target as unknown as Record<string | symbol, unknown>)[prop]
      return typeof val === 'function' ? val.bind(target) : val
    },
  })
}

export async function getTestEnv(): Promise<RulesTestEnvironment> {
  if (!env) env = await createEnv()
  return env
}
