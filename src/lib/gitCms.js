import { posts, labels } from '$lib/stores';
import { get } from 'svelte/store';
import { GITHUB_REPO, GITHUB_LABEL_PREFIX, GITHUB_LABEL_PUBLISHED, GITHUB_ALLOWED_AUTHORS, GITHUB_TOKEN, SLUG_SUFFIX_ISSUE_NUMBER } from './constants';

const GITHUB_REPO_BASE_URL = `https://api.github.com/repos/${GITHUB_REPO}`
const labelActions = ['created', 'edited', 'deleted']
const issueActions = ['opened', 'edited', 'deleted', 'pinned', 'unpinned', 'labeled', 'unlabeled']

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

/** @type {Object<string, string>} */
const gitHeaders = {
    accept: 'application/vnd.github+json'
}

if (GITHUB_TOKEN) {
    gitHeaders['Authorization'] = `token ${GITHUB_TOKEN}`
};

/**
 * @param {string} label
 * @returns {string}
 */
function labelToTag(label) {
    return label.slice(GITHUB_LABEL_PREFIX.length)
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
 * @returns {string}
 */
function safeSlugify(text, suffix) {
    return SLUG_SUFFIX_ISSUE_NUMBER && suffix ? slugify(text) + `-${suffix}` : slugify(text)
}

/**
 * @param {import('./types').GithubLabel} label
 * @returns {import('./types').PostLabel}
 */
function parsePostLabel(label) {
    return {
        name: labelToTag(label.name),
        color: label.color,
        description: label.description,
        default: label.default
    }
}

/**
 * @param {import('./types').GithubIssue} issue
 * @returns {import('./types').Post}
 */
 function parsePost(issue) {
    return {
        number: issue.number,
        title: issue.title,
        body: issue.body,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        reactions: issue.reactions,
        author: {
            username: issue.user.login,
            avatar_url: issue.user.avatar_url,
            admin: issue.user.site_admin
        },
        tags: issue.labels
            .filter(e => e.name !== GITHUB_LABEL_PUBLISHED && e.name.startsWith(GITHUB_LABEL_PREFIX))
            .map(a => labelToTag(a.name))
    }
}

/**
 * @param {Request} request
 */
export async function handleWebhook(request) {
    const data = await request.json();
    if (
        // received event is about an issue
        data.issue 
        // received event is an issue event we care about
        && issueActions.includes(data.action) 
        // issue is created by allowed authors
        && GITHUB_ALLOWED_AUTHORS.includes(data.issue.user.login)
    ) {
        /** @type {import('./types').GithubIssue} */
        let currentIssue = data.issue
        let existingIssues = get(posts)
        let slug = safeSlugify(currentIssue.title, currentIssue.number)
        let issueLabels = currentIssue.labels.map(function (obj) {
            return obj.name
        })
        let unpublished = data.action === 'unlabeled' && !issueLabels.includes(GITHUB_LABEL_PUBLISHED)
        if ((data.action === 'deleted') || unpublished) {
            delete existingIssues[slug]
            posts.set(existingIssues)
        } else if (issueLabels.includes(GITHUB_LABEL_PUBLISHED)) {
            let newPost = parsePost(currentIssue)
            existingIssues[slug] = newPost
            posts.set(existingIssues)
        }
    } else if (
            // received event is about a label
            data.label 
            // label has a name just being extra cautious
            && data.label.name 
            // published label is not allows as a tag
            && data.label.name !== GITHUB_LABEL_PUBLISHED
            // label is created for the the svelte-git-cms
            && data.label.name.startsWith(GITHUB_LABEL_PREFIX)
            // received event is a label event we care about
            && labelActions.includes(data.action)
        ) {
        /** @type {import('./types').GithubLabel} */
        let currentLabel = data.label
        let currentTag = labelToTag(currentLabel.name)
        let currentLabels = get(labels)
        if (data.action === 'deleted') {
            delete currentLabels[currentTag]
            labels.set(currentLabels)
        } else {
            let newLabel = parsePostLabel(currentLabel)
            currentLabels[currentTag] = newLabel
            labels.set(currentLabels)   
        }
    }
    return new Response('ok');
}

/**
 * 
 * @returns {Promise<import('./types').Posts>}
 */
export async function getPosts() {
    let next = null
	/** @type {import('./types').Posts} */
	let existingIssues = {}
    let url = `${GITHUB_REPO_BASE_URL}/issues?` + new URLSearchParams({
        'state': 'all',
        'labels': GITHUB_LABEL_PUBLISHED,
        'per_page': '100',
        'pulls': 'false',
    })
    // pull issues created by allowed author only
    if (GITHUB_ALLOWED_AUTHORS.length === 1) {
        url += new URLSearchParams({'creator': GITHUB_ALLOWED_AUTHORS[0]})
    }
    do {
		const response = await fetch(next?.url || url, { headers: gitHeaders });
        const gitIssues = await response.json();
        if ('message' in gitIssues && response.status > 400)
			throw new Error(response.status + ' ' + response.statusText + '\n' + (gitIssues && gitIssues.message));
        gitIssues.forEach(
			/** @param {import('./types').GithubIssue} issue */
			(issue) => {
                if (GITHUB_ALLOWED_AUTHORS.includes(issue.user.login)) {
                    let slug = safeSlugify(issue.title, issue.number)
                    let newPost = parsePost(issue)
                    existingIssues[slug] = newPost
                }
			}
		);
		const headers = parseLink(response.headers.get('Link'));
		next = headers && headers.next;
	} while (next);
	return existingIssues
}

/**
 * 
 * @returns {Promise<import('./types').PostLabels>}
 */
export async function getTags() {
    let next = null
	/** @type {import('./types').PostLabels} */
	let existingLabels = {}
    let url =  `${GITHUB_REPO_BASE_URL}/labels?` + new URLSearchParams({
        'per_page': '100',
    })
    do {
		const response = await fetch(next?.url || url, { headers: gitHeaders });
		const gitLabels = await response.json();
		if ('message' in gitLabels && response.status > 400)
			throw new Error(response.status + ' ' + response.statusText + '\n' + (gitLabels && gitLabels.message));
        gitLabels.forEach(
			/** @param {import('./types').GithubLabel} label */
			(label) => {
                if (label.name !== GITHUB_LABEL_PUBLISHED && label.name.startsWith(GITHUB_LABEL_PREFIX)) {
                    existingLabels[labelToTag(label.name)] = parsePostLabel(label)
                }
			}
		);
		const headers = parseLink(response.headers.get('Link'));
		next = headers && headers.next;
	} while (next);
	return existingLabels
}