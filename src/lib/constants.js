export const GITHUB_LABEL_PREFIX = process.env.GITHUB_LABEL_PREFIX == undefined ? '+' : process.env.GITHUB_LABEL_PREFIX
export const GITHUB_LABEL_PUBLISHED = process.env.GITHUB_LABEL_PUBLISHED || '+page'
export const GITHUB_REPO = process.env.GITHUB_REPO || 'ak4zh/svelte-git-cms'
export const GITHUB_ALLOWED_AUTHORS = (process.env.GITHUB_ALLOWED_AUTHORS || GITHUB_REPO.split('/')[0]).split(',').filter(e => e)
export const GITHUB_TOKEN = process.env.GH_TOKEN
export const SLUG_SUFFIX_ISSUE_NUMBER = process.env.SLUG_SUFFIX_ISSUE_NUMBER