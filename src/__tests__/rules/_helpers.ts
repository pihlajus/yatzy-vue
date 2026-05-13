import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import fs from 'node:fs'
import path from 'node:path'

let env: RulesTestEnvironment | null = null

export async function getTestEnv(): Promise<RulesTestEnvironment> {
  if (env) return env
  env = await initializeTestEnvironment({
    projectId: 'yatzy-rules-test',
    firestore: {
      rules: fs.readFileSync(path.resolve('firestore.rules'), 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  })
  return env
}
