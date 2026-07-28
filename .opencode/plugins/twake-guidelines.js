/**
 * Twake Guidelines plugin for OpenCode.
 *
 * Registers the package's skills/ directory with OpenCode's native skill
 * discovery, so every skills/<name>/SKILL.md becomes an auto-triggered skill
 * (selected by its frontmatter `description`) without symlinks, config edits,
 * or loading the aggregated AGENTS.md into every session.
 */

import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const TwakeGuidelinesPlugin = async ({ client }) => {
  const skillsDir = path.resolve(__dirname, '../../skills')

  await client.app.log({
    body: {
      service: 'twake-guidelines',
      level: 'info',
      message: `Registering Twake Guidelines skills from ${skillsDir}`
    }
  })

  return {
    config: async (config) => {
      config.skills = config.skills || {}
      config.skills.paths = config.skills.paths || []
      if (!config.skills.paths.includes(skillsDir)) {
        config.skills.paths.push(skillsDir)
      }
    }
  }
}
