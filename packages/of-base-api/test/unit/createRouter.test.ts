import _ from 'lodash';
import should from 'should';
import Sinon from 'sinon';
import BaseController from '../../src/BaseController';
import createRouter, { createRouteHandlers } from '../../src/rest/createRouter';
import * as utils from '../support/utils';

const sinon = Sinon.createSandbox();

describe('createRouter', () => {
	afterEach(() => {
		sinon.restore();
	});
	describe('main function', () => {
		let TestController;

		beforeEach(() => {
			TestController = class extends BaseController {
				constructor(model) {
					super();
					this.model = model;
				}
			};
		});

		it('should successfully create a router', done => {
			const model = {};
			const mockClass = utils.makeMockControllerClass(model, TestController);
			const router = createRouter(mockClass, 'test');
			should(router).have.property('params');
			done();
		});

		it('should fail with missing controller', done => {
			try {
				createRouter(null, 'test');
			} catch (err) {
				err.should.have.property('message').equal('Invalid Controller - missing Controller');
				done();
			}
		});

		it('should fail with invalid controller', done => {
			try {
				createRouter('this is the wrong type', 'test');
			} catch (err) {
				err.should.have.property('message').equal('Invalid Controller - not function');
				done();
			}
		});

		it('should succeed even with invalid controller definitions', done => {
			const model = {};
			utils.makeMockControllerClass(model, TestController);
			done();
		});

		it('should convert paths from swagger {x} to express :x format', done => {
			const def = {
				paths: {
					'/{id}': {
						put: {
							summary: 'First Thing',
							operationId: 'update'
						}
					},
					'/{one}/{two}': {
						get: {
							summary: 'Another Thing',
							operationId: 'update'
						}
					}
				}
			};

			class ParamController extends BaseController {
				constructor() {
					super(def);
				}
			}

			const router = createRouter(ParamController);

			should(router)
				.have.property('stack')
				.of.length(2);
			router.stack[0].should.have.property('route');
			router.stack[0].route.should.have.property('path').equal('/:id');
			router.stack[1].should.have.property('route');
			router.stack[1].route.should.have.property('path').equal('/:one/:two');
			done();
		});
	});

	describe('response definitions', () => {
		const mockDef = {
			paths: {
				'/test': {
					get: {
						summary: 'Testing given success response code',
						operationId: 'test',
						responses: {
							201: {
								description: 'Created something'
							},
							429: {
								description: 'Slow down!'
							}
						}
					},
					put: {
						summary: 'Testing default response code',
						operationId: 'test',
						responses: {}
					}
				}
			}
		};
		class MockController extends BaseController {
			constructor({ def = mockDef } = {}) {
				super(def, null);
			}

			async test({}) {
				return {};
			}
		}

		it('should use the specified success response code', async () => {
			const router = createRouter(MockController);

			const req = {};
			const res = {
				statusCode: null,
				status: code => {
					res.statusCode = +code;
					return res;
				},
				json: () => {
					return res;
				},
				end: () => {}
			};

			await router.stack[0].route.stack[0].handle(req, res);
			res.statusCode.should.equal(201);
		});

		it('should use a default response code when none specified', async () => {
			const router = createRouter(MockController);

			const req = {};
			const res = {
				statusCode: null,
				status: code => {
					res.statusCode = +code;
					return res;
				},
				json: () => {
					return res;
				},
				end: () => {}
			};

			await router.stack[1].route.stack[0].handle(req, res);
			res.statusCode.should.equal(200);
		});
	});

	describe('createRouteHandlers', () => {
		let TestController;
		beforeEach(() => {
			TestController = class extends BaseController {
				constructor(model) {
					super();
					this.model = model;
				}

				syncMethod() {
					return 'result';
				}

				async asyncMethod() {
					return 'asyncResult';
				}
			};
		});

		it('should correctly coerce synchronous controller methods to return a promise', async () => {
			const model = {};
			const MockClass = utils.makeMockControllerClass(model, TestController);
			const handlers = createRouteHandlers(new MockClass(), null, null);
			// @ts-ignore
			const { handler: synchronousHandler } = _.find(handlers, { path: '/syncMethod' });
			const reqMock = { body: {} };
			const resMock = {
				status: null,
				json: null
			};
			resMock.status = sinon.stub().returns(resMock);
			resMock.json = sinon.stub();
			const promise = synchronousHandler(reqMock, resMock);
			promise.should.be.a.Promise();
			await promise;
			resMock.json.firstCall.args[0].should.be.equal('result');
		});

		it('should correctly handle asynchronous controller methods', async () => {
			const model = {};
			const MockClass = utils.makeMockControllerClass(model, TestController);
			const handlers = createRouteHandlers(new MockClass(), null, null);
			// @ts-ignore
			const { handler: asynchronousHandler } = _.find(handlers, { path: '/asyncMethod' });
			const reqMock = { body: {} };
			const resMock = {
				status: null,
				json: null
			};
			resMock.status = sinon.stub().returns(resMock);
			resMock.json = sinon.stub();
			const promise = asynchronousHandler(reqMock, resMock);
			promise.should.be.a.Promise();
			await promise;
			resMock.json.firstCall.args[0].should.be.equal('asyncResult');
		});
	});
});