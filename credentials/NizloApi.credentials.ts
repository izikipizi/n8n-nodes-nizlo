import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

export class NizloApi implements ICredentialType {
	name = 'nizloApi';

	displayName = 'Nizlo API';

	icon: Icon = 'file:../nodes/Nizlo/nizlo.svg';

	documentationUrl = 'https://nizlo.com/rmm-api';

	properties: INodeProperties[] = [
		{
			displayName: 'Personal Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Create a permission-limited token in Nizlo under Admin > API Access. The token remains attached to the technician who created it.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.accessToken}}',
				Accept: 'application/json',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://app.nizlo.com/api/v1',
			url: '/auth/me',
			method: 'GET',
		},
	};
}
