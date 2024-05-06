const core = require('@actions/core')
const DownloadArtifact = require('./lib/download-artifact')

async function run() {
    try {
        const name = core.getInput('name', { required: true })
        const path = core.getInput('path', { required: false })
        const token = core.getInput('token', { required: true })

        const downloadArtifact = new DownloadArtifact(token, path)
        downloadArtifact.init()

        core.info(`Looking for an artifact '${name}'...`)
        const artifactId = await downloadArtifact.getLastArtifactIdByName(name)
        if (!artifactId) {
            core.setFailed('no artifacts found')
            return
        }

        core.info(`Will be downloading artifact id '${artifactId}'`)
        await downloadArtifact.downloadArtifact(artifactId)

    } catch (error) {
        core.setFailed(error.status)
        core.setFailed(error.response)
        core.setFailed(error.message)
    }
}

run()
