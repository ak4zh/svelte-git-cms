import { writable, get } from "svelte/store";

const GITHUB_REPO_BASE_URL = `https://api.github.com/repos`
const LABEL_ACTIONS = ['created', 'edited', 'deleted']
const ISSUE_ACTIONS = ['opened', 'edited', 'deleted', 'pinned', 'unpinned', 'labeled', 'unlabeled']


/**
 * @param {string} text
 * @returns {string}
 */
function readingTime(text) {
    let minutes = Math.ceil((text || '').trim().split(' ').length / 225)
    return minutes > 1 ? `${minutes} minutes` : `${minutes} minute`
}


/**
 * @param {string} text
 * @returns {import('./types').ParsedContent}
 */
 function parseFrontMatter(text) {
    let delimiter = text.match(/^\-+/g)
    let parsed = {content: text, data: {}}
	let cleaner = new RegExp(`^${delimiter}|${delimiter}$`,"g");
    if (delimiter) {
        let frontMatterText = (text.match(/^(-+)[\s\S]+\1/g) || [''])[0]
        let cleanFrontMatter = frontMatterText.replace(cleaner, '')
        let frontMatters = [...cleanFrontMatter.matchAll(/([\w_]+):(.+)/g)]
        frontMatters.forEach(m => {
            // @ts-ignore
            parsed.data[m[1].trim()] = m[2].trim()
        })
    }
    return parsed
}

/**
 * @param {string} repo_name 
 * @returns {import('./types').ParsedConfig}
 */
function getDefaultConfig(repo_name='ak4zh/svelte-git-cms') {
    return {
        github_repo: repo_name,
        label_published: '',
        label_prefix: '',
        slug_suffix_issue_number: true,
        allowed_authors: repo_name.split('/')[0].split(',')
}
}

/** @type {import('svelte/store').Writable<Object<string, import('./types').ParsedConfig>>} */
export const parsedConfigs = writable({})

/** @type {import('svelte/store').Writable<Object<string, import('./types').CMS>>} */
export const cms = writable({})

/**
 * @typedef {"next" | "prev" | "last" | "first"} LinkType
 */
/**
 * @param {string | null} link
 * @returns {Object<LinkType, string>}
 */
 function parseLink(link) {
	/** @type {Object<LinkType, string>}, string>} */  	
	const output = {};
	if (link) {
		const regex = /<([^>]+)>; rel="([^"]+)"/g;
		let m;
		while (m = regex.exec(link)) {
			const [_, v, k] = m;
			output[k] = v;
		}	
	}
	return output;
}

/**
 * @param {import('./types').ParsedConfig} config
 * @returns {Object<string, string>}
 */
function getHeaders(config) {
    /** @type {Object<string, string>} */
    const gitHeaders = {
        accept: 'application/vnd.github.full+json'
    }
    if (config.github_token) {
        gitHeaders['Authorization'] = `token ${config.github_token}`
    };
    return gitHeaders
}

/**
 * @param {string} label
 * @param {string} label_prefix
 * @returns {string}
 */
function labelToTag(label, label_prefix) {
    return label_prefix ? label.slice(label_prefix.length) : label
}

/**
 * @param {string | number} text
 * @returns {string}
 */
function slugify(text) {
    return text
        .toString()                 // Cast to string (optional)
        .normalize('NFKD')          // The normalize() using NFKD method returns the Unicode Normalization Form of a given string.
        .toLowerCase()              // Convert the string to lowercase letters
        .trim()                     // Remove whitespace from both sides of a string (optional)
        .replace(/\s+/g, '-')       // Replace spaces with -
        .replace(/[^\w\-]+/g, '')   // Remove all non-word chars
        .replace(/\-\-+/g, '-')     // Replace multiple - with single -
        .replace(/\-$/g, '');       // Remove trailing -
}

/**
 * @param {string | number} text
 * @param {string | number | undefined} suffix
 * @param {boolean} slug_suffix_issue_number
 * @returns {string}
 */
function safeSlugify(text, suffix, slug_suffix_issue_number=true) {
    return slug_suffix_issue_number && suffix ? slugify(text) + `-${suffix}` : slugify(text)
}

/**
 * @param {import('./types').GithubLabel} label
 * @param {string} label_prefix
 * @returns {import('./types').PostLabel}
 */
function parsePostLabel(label, label_prefix) {
    return {
        name: labelToTag(label.name, label_prefix),
        color: label.color,
        description: label.description,
        default: label.default
    }
}

/**
 * @param {import('./types').GithubIssue} issue
 * @param {import('./types').ParsedConfig} config
 * @returns {import('./types').Post}
 */
 function parsePost(issue, config) {
    const { data } = parseFrontMatter(issue.body || '')
    data.description = data.description || (issue.body || '')
        .replace(/^(-+)[\s\S]+\1/g, '')
        .trim().split('\n')[0].substring(0, 200) 
    data.slug = data.slug || safeSlugify(issue.title, issue.number)
    let body_html = issue.body_html || ''
    if (Object.keys(data).length) {
        // remove front_matter html
        body_html = body_html.replace(/[\s\S]+?<\/h2>/g, '')
    }
    return {
        front_matter: data,
        number: issue.number,
        title: issue.title,
        body: body_html,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        reactions: issue.reactions,
        author: {
            username: issue.user.login,
            avatar_url: issue.user.avatar_url,
            admin: issue.user.site_admin
        },
        tags: issue.labels
            .filter(e => e.name !== config.label_published &&  e.name.startsWith(config.label_prefix))
            .map(a => labelToTag(a.name, config.label_prefix)),
        reading_time: readingTime(issue.body_text)
    }
}

/**
 * @param {Request} request
 */
export async function handleWebhook(request) {
    const data = await request.json();
    let repo = String(data.repository.full_name)
    let config = get(parsedConfigs)[repo] || getDefaultConfig(repo)
    if (config) {
        let currentCMS = get(cms)[repo]
        if (
            // received event is about an issue
            data.issue 
            // received event is an issue event we care about
            && ISSUE_ACTIONS.includes(data.action) 
            // issue is created by allowed authors
            && config.allowed_authors.includes(data.issue.user.login)
        ) {
            /** @type {import('./types').GithubIssue} */
            let currentIssue = data.issue
            let parsedPost = parsePost(currentIssue, config)
            let issueLabels = currentIssue.labels.map(function (obj) {
                return obj.name
            })
            // label removed and we have a published label set and remaining labels does not contain published label
            let unpublished = data.action === 'unlabeled' && config.label_published && !issueLabels.includes(config.label_published)
            if ((data.action === 'deleted') || unpublished) {
                delete currentCMS.posts[String(currentIssue.number)]
                cms.set({...get(cms), ...{[repo]: currentCMS}})
            } else if (!config.label_published || issueLabels.includes(config.label_published)) {
                currentCMS.posts[String(currentIssue.number)] = parsedPost
                cms.set({...get(cms), ...{[repo]: currentCMS}})
            }
        } else if (
                // received event is about a label
                data.label 
                // label has a name just being extra cautious
                && data.label.name 
                // published label is not allows as a tag
                && data.label.name !== config.label_published
                // label is created for the the svelte-git-cms
                && data.label.name.startsWith(config.label_prefix)
                // received event is a label event we care about
                && LABEL_ACTIONS.includes(data.action)
            ) {
            /** @type {import('./types').GithubLabel} */
            let currentLabel = data.label
            if (data.action === 'deleted') {
                delete currentCMS.labels[String(currentLabel.id)]
                cms.set({...get(cms), ...{[repo]: currentCMS}})
            } else {
                let newLabel = parsePostLabel(currentLabel, config.label_prefix)
                currentCMS.labels[String(currentLabel.id)] = newLabel
                cms.set({...get(cms), ...{[repo]: currentCMS}})
            }
        }
    
    }
    return new Response('ok');
}

/**
 * @param {import('./types').ParsedConfig} config
 * @returns {Promise<import('./types').Posts>}
 */
export async function getPosts(config) {
    let next = ''
    let page = 0
	/** @type {import('./types').Posts} */
	let existingPosts = {}
    let url = `${GITHUB_REPO_BASE_URL}/${config.github_repo}/issues?` + new URLSearchParams({
        'state': 'all',
        'labels': config.label_published,
        'per_page': '100',
        'pulls': 'false',
    })
    // pull issues created by allowed author only
    if (config.allowed_authors.length === 1) {
        url +=  '&' + new URLSearchParams({'creator': config.allowed_authors[0]})
    }
    do {
        page += 1
		const response = await fetch(next || url, { headers: getHeaders(config) });
        const gitIssues = await response.json();
        if ('message' in gitIssues && response.status > 400)
			throw new Error(response.status + ' ' + response.statusText + '\n' + (gitIssues && gitIssues.message));
        gitIssues.forEach(
			/** @param {import('./types').GithubIssue} issue */
			(issue) => {
                if (config.allowed_authors.includes(issue.user.login)) {
                    let newPost = parsePost(issue, config)
                    existingPosts[String(issue.number)] = newPost
                }
			}
		);
        if (!config.max_page || (config.max_page && page < config.max_page)) {
            next = parseLink(response.headers.get('Link'))?.next
        }
	} while (next);
	return existingPosts
}

/**
 * @param {import('./types').ParsedConfig} config
 * @returns {Promise<import('./types').PostLabels>}
 */
export async function getTags(config) {
    let next = null
	/** @type {import('./types').PostLabels} */
	let existingLabels = {}
    let url =  `${GITHUB_REPO_BASE_URL}/${config.github_repo}/labels?` + new URLSearchParams({
        'per_page': '100',
    })
    do {
		const response = await fetch(next?.url || url, { headers: getHeaders(config) });
		const gitLabels = await response.json();
		if ('message' in gitLabels && response.status > 400)
			throw new Error(response.status + ' ' + response.statusText + '\n' + (gitLabels && gitLabels.message));
        gitLabels.forEach(
			/** @param {import('./types').GithubLabel} label */
			(label) => {
                if (label.name !== config.label_published && label.name.startsWith(config.label_prefix)) {
                    existingLabels[String(label.id)] = parsePostLabel(label, config.label_prefix)
                }
			}
		);
		const headers = parseLink(response.headers.get('Link'));
		next = headers && headers.next;
	} while (next);
	return existingLabels
}

/**
 * @param {import('./types').Config} config
 */
export async function githubSync(config) {
    if (!Object.keys(get(parsedConfigs)).includes(config.github_repo)) {
        let author = (config.allowed_authors || '').split(',').filter(e => e)
        if (!author.length) {
            author = config.github_repo.split('/')[0].split(',').filter(e => e)
        }
        delete config.allowed_authors
        /** @type {import('./types').ParsedConfig} */
        let currentConfig = {...getDefaultConfig(config.github_repo), ...config, allowed_authors: author}
        let existingPosts = await getPosts(currentConfig)
        let existingLabels = await getTags(currentConfig)
        let currentCMS = get(cms)
        currentCMS[currentConfig.github_repo] = {
            posts: existingPosts,
            labels: existingLabels
        }
        cms.set({...get(cms), ...currentCMS})
        let existingConfigs = get(parsedConfigs)
        existingConfigs[config.github_repo] = currentConfig
        parsedConfigs.set(existingConfigs)
    }
}


/**
 * @param {string} repo
 * @returns {Promise<import('./types').SortedCMS>}
 */
export async function getCmsData(repo) {
    let posts = Object.values(get(cms)[repo]?.posts || {})
            .sort(function(a, b) {
            return b.number - a.number;
        })
    let labels = Object.values(get(cms)[repo]?.labels || {})
            .sort(function(a, b) {
            return b.number - a.number;
        })
    return {posts, labels}
}