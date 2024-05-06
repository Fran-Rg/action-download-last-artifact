const github = require('@actions/github')
const core = require('@actions/core')
const { normalize, resolve } = require('path')
const AdmZip = require('adm-zip')
const os = require('os')

class DownloadArtifact {
    constructor(token, path) {
        this.path = this.getAbsolutePath(path)
        this.token = token
    }

    init() {
        this.client = github.getOctokit(this.token)
        this.repository = {
            owner: Object.assign({}, github.context.payload.repository.owner, github.context.payload.organization).login,
            repo: github.context.payload.repository.name
        }
    }

    getAbsolutePath(path) {
        // resolve tilde expansions, path.replace only replaces the first occurrence of a pattern
        if (path.startsWith(`~`)) {
            return resolve(normalize(path.replace('~', os.homedir())))
        }

        return resolve(normalize(path))
    }

    async getLastArtifactIdByName(name) {
        for await (const response of this.client.paginate.iterator(
            this.client.rest.actions.listArtifactsForRepo, this.repository)) {
            for (const artifact of response.data) {
                if (artifact.name === name) {
                    return artifact.id
                }
            }
        }

        return 0
    }

    async downloadArtifact(artifactId) {
        let zip;
        try {
            // zip = await this.client.actions.downloadArtifact({
            //     ...this.repository,
            //     artifact_id: artifactId,
            //     archive_format: 'zip'
            // })
            zip = await this.client.request('GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}/{archive_format}', {
                ...this.repository,
                artifact_id: artifactId,
                archive_format: 'zip',
                headers: {
                    'X-GitHub-Api-Version': '2022-11-28'
                }
            })
        } catch (error) {
            // Octokit errors always have a `error.status` property which is the http response code
            core.info('Error:', error)
            if (error.status == 403) {
                // see https://github.com/orgs/community/discussions/88698
                zip = await this.client.request('GET ' + error.response.url,)
            }
            //  else {
            //     // handle all other errors
            //     throw error
            // }
        }

        const adm = new AdmZip(Buffer.from(zip.data))

        adm.extractAllTo(this.path, true)
    }
}

module.exports = DownloadArtifact
