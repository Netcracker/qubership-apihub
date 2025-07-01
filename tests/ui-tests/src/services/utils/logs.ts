import process from 'process'

export const logEnvVars = (vars: string[]): void => {
  console.log('\nEnvironment variables:')
  for (const envVar of vars) {
    console.log(`${envVar}: ${process.env[envVar]}`)
  }
  console.log()
}
