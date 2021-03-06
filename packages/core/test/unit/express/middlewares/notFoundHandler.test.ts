import sinon from 'sinon';
import should from 'should';
import notFoundHandler from '../../../../src/express/middlewares/notFoundHandler';

describe('notFoundHandler', () => {
	it('should throw a 404 error', async () => {
		const handler = notFoundHandler();
		const req = { url: 'some-url' };
		const res = {};
		const next = sinon.stub();

		handler(req, res, next);

		should(next.callCount).equal(1);
		const [error] = next.getCall(0).args;
		error.should.match({ code: 404, data: { url: 'some-url' } });
	});
});
