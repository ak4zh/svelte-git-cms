import { env } from '$env/dynamic/public'

export const GITHUB_LABEL_PREFIX = env?.GITHUB_LABEL_PREFIX == undefined ? '+' : env.GITHUB_LABEL_PREFIX
export const GITHUB_LABEL_PUBLISHED = env?.GITHUB_LABEL_PUBLISHED || '+page'
export const GITHUB_REPO = env?.GITHUB_REPO || 'ak4zh/svelte-git-cms'
export const GITHUB_ALLOWED_AUTHORS = (env?.GITHUB_ALLOWED_AUTHORS || GITHUB_REPO.split('/')[0]).split(',').filter(e => e)
export const SLUG_SUFFIX_ISSUE_NUMBER = env?.SLUG_SUFFIX_ISSUE_NUMBER

export type Config = {
	github_repo: string,
	label_prefix: string,
	label_published: string,
	slug_suffix_issue_number?: boolean,
	allowed_authors?: string,
	github_token?: string
}

export type ParsedConfig = {
	github_repo: string,
	label_prefix: string,
	label_published: string,
	allowed_authors: string[],
	slug_suffix_issue_number: boolean,
	github_token?: string
}

export type ParsedConfig = {
	github_repo: string,
	label_prefix?: string,
	label_published?: string,
	allowed_authors?: string,
	slug_suffix_issue_number?: boolean,
	github_token?: string
}

export type PostLabel = {
	name: string;
	description: string;
	color: string;
	default: Boolean;
};

export type LabelExtras = {
    node_id: string,
    url: string,
    id: number
}

export type GithubLabel = PostLabel & LabelExtras

export type GithubReactions = {
	total_count: number;
	'+1': number;
	'-1': number;
	laugh: number;
	hooray: number;
	confused: number;
	heart: number;
	rocket: number;
	eyes: number;
};

export type GithubComment = {
	body: string;
	user: GithubUser;
	created_at: Date;
	updated_at: Date;
	html_url: string;
	issue_url: string;
	author_association: string;
	reactions: GithubReactions;
};

export type GithubUser = {
	login: string;
	avatar_url: string;
	id: number;
	node_id: string;
	avatar_url: string;
	gravatar_id: string;
	url: string;
	html_url: string;
	followers_url: string;
	following_url: string;
	gists_url: string;
	starred_url: string;
	subscriptions_url: string;
	organizations_url: string;
	repos_url: string;
	events_url: string;
	received_events_url: string;
	type: 'User';
	site_admin: boolean;
};

export type BaseIssue = {
	number: number,
    title: string;
	created_at: Date;
	updated_at: Date;
	reactions: GithubReactions;
}

export type GithubIssue = BaseIssue & {
	user: GithubUser;
	html_url: string;
	body: string;
	body_html: string;
	body_text: string;
	comments_url: string;
	labels: {
		name: string;
	}[];
}

export type IssueAuthor = {
    username: string,
    avatar_url: string,
    admin: boolean
}

export type Post = BaseIssue & {
	front_matter: Object.<string, string>;
    author: IssueAuthor;
	tags: string[];
	body: string;
	reading_time: string
}

export type PostLabels = Object.<string, PostLabel>
export type Posts = Object.<string, Post>

export type ParsedContent = {
    content: string,
	data: Object<string, string>
}

export type CMS = {
	posts: Posts,
	labels: PostLabels
}