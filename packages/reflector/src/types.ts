import { GraphQLScalarType } from 'graphql';

export interface ClassType<T = any> {
	new (...args: any[]): T;
}

export interface RecursiveArray<TValue> extends Array<RecursiveArray<TValue> | TValue> {}

export type TypeValue = ClassType | GraphQLScalarType | Function | object | symbol;
export type ReturnTypeFuncValue = TypeValue | RecursiveArray<TypeValue>;
export type ReturnTypeFunc = (returns?: void) => ReturnTypeFuncValue;

/**
 * @param type - The type of the field. Only Required for complex objects: Classes, Arrays, Objects
 */
export interface IFieldDecoratorOptions {
	type?: any;
	required?: boolean;
	description?: string;
}

export interface IFieldDecoratorMetadata {
	key: any;
	opts?: IFieldDecoratorOptions;
}
