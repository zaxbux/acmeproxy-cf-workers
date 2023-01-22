export interface HTTPException {
	status: number
	statusText: string
	reason?: string
}

export class BadRequestException extends Error implements HTTPException {
	status: number;
	statusText: string;
	reason?: string;

	constructor(reason: string) {
		super()
		this.status = 400;
		this.statusText = 'Bad Request';
		this.reason = reason;
	}
}

export class UnauthorizedException extends Error implements HTTPException {
	status: number;
	statusText: string;
	reason?: string;
	responseInit?: ResponseInit;

	constructor(reason: string, response?: ResponseInit) {
		super()
		this.status = 401;
		this.statusText = 'Unauthorized';
		this.reason = reason;
		this.responseInit = this.responseInit;
	}
}

export class ForbiddenException extends Error implements HTTPException {
	status: number;
	statusText: string;
	reason?: string;

	constructor(reason: string) {
		super()
		this.status = 403;
		this.statusText = 'Forbidden';
		this.reason = reason;
	}
}

export class NotFoundException extends Error implements HTTPException {
	status: number;
	statusText: string;
	reason?: string;

	constructor(reason?: string) {
		super()
		this.status = 404;
		this.statusText = 'Not Found';
		this.reason = reason;
	}
}