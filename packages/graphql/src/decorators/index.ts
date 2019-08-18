import _ from 'lodash';

/**
 * It annotates a variable as schema prop
 * @param opts
 */
export function prop(opts?: { type?: any; required?: boolean }) {
	// this is the decorator factory
	return function(target: Object, key: string | symbol): void {
		// this is the decorator

		// get the existing metadata props
		const props = Reflect.getMetadata('tsgraphql:props', target) || [];
		props.push({ key, opts });
		// define new metadata props
		Reflect.defineMetadata('tsgraphql:props', props, target);
	};
}

/**
 * Decorator that annotate a query method
 * @param name
 */
export const Query = (name): Function => {
	return function(target: Object, methodName: string | symbol) {
		const queries = Reflect.getMetadata('tsgraphql:queries', target) || [];
		queries.unshift({ name, methodName, handler: target[methodName] });

		Reflect.defineMetadata('tsgraphql:queries', queries, target);
	};
};

/**
 * Decorator that annotate a mutation method
 * @param name
 */
export const Mutation = (name): Function => {
	return function(target: Object, methodName: string | symbol) {
		const queries = Reflect.getMetadata('tsgraphql:queries', target) || [];
		queries.unshift({ name, methodName, handler: target[methodName] });

		Reflect.defineMetadata('tsgraphql:queries', queries, target);
	};
};

/**
 * Decorator that annotate a method parameter
 * @param options
 */
export function arg(options): Function {
	return function(target: Object, methodName: string, index) {
		// get the existing metadata props
		const methodParameters = Reflect.getMetadata('tsgraphql:method-parameters', target) || [];
		const paramtypes = Reflect.getMetadata('design:paramtypes', target, methodName);
		const isAlreadySet = !!_.find(methodParameters, { methodName, index });
		if (isAlreadySet) return;

		methodParameters.unshift({
			target,
			methodName,
			index,
			options,
			handler: target[methodName],
			/*
				The method: Reflect.getMetadata('design:paramtypes', target, methodName);
				doesn't seem to be working in the test environment, so the paramtypes array is always undefined
				TODO: find a better solution
			 */
			type: paramtypes && paramtypes[index]
		});
		Reflect.defineMetadata('tsgraphql:method-parameters', methodParameters, target);
	};
}

export interface IResolverDecoratorArgs {
	excludedMethods?: string[];
	resourceSchema?: Function;
}

/**
 * Decorator that annotate a controller.
 * It allows setting the basepath, resourceSchema, etc
 * @param args
 */
export function resolver(args?: IResolverDecoratorArgs): Function {
	return function(target: Object) {
		// define new metadata props
		Reflect.defineMetadata('tsgraphql:resolver', args, target);
	};
}
