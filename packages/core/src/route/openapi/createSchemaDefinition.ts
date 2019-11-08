import _fp from 'lodash/fp';
import { Reflector } from '@davinci/reflector';
import { ISwaggerDefinitions, IPropDecoratorMetadata } from '../types';

export const getSchemaDefinition = (theClass: Function, definitions = {}): ISwaggerDefinitions => {
	const makeSchema = (typeOrClass, key?) => {
		// it's a primitive type, simple case
		if ([String, Number, Boolean, Date].includes(typeOrClass)) {
			if (typeOrClass === Date) {
				return { type: 'string', format: 'date-time' };
			}

			return { type: typeOrClass.name.toLowerCase() };
		}

		// it's an array => recursively call makeSchema on the first array element
		if (Array.isArray(typeOrClass)) {
			return {
				type: 'array',
				items: makeSchema(typeOrClass[0], key)
			};
		}

		// it's an object (but not a definition) => recursively call makeSchema on the properties
		if (typeof typeOrClass === 'object') {
			const properties = _fp.map((value, k) => ({ [k]: makeSchema(value) }), typeOrClass);
			return {
				type: 'object',
				properties: _fp.isEmpty(properties) ? undefined : properties
			};
		}

		// it's a class => create a definition nad recursively call makeSchema on the properties
		if (typeof typeOrClass === 'function') {
			const definitionMetadata = Reflector.getMetadata(
				'davinci:openapi:definition',
				typeOrClass.prototype.constructor
			);
			const hasDefinitionDecoration = !!definitionMetadata;
			const definitionObj = {
				...(definitionMetadata || {}),
				type: 'object'
			};

			const title: string = hasDefinitionDecoration
				? definitionMetadata.title
				: key || typeOrClass.name;
			if (hasDefinitionDecoration) {
				if (definitions[title]) {
					return {
						$ref: `#/definitions/${title}`
					};
				}

				definitions[title] = definitionObj;
			}

			if (title.toLowerCase() !== 'object') {
				definitionObj.title = title;
			}

			const props: IPropDecoratorMetadata[] =
				Reflector.getMetadata('davinci:openapi:props', typeOrClass.prototype.constructor) || [];

			const properties = props.reduce((acc, { key: k, optsFactory }) => {
				const opts = optsFactory();

				// it's a rawType, we can just return it
				if (opts && opts.rawType) {
					acc[k] = opts.rawType;
					return acc;
				}

				let type =
					opts && opts.type
						? opts.type
						: Reflector.getMetadata('design:type', typeOrClass.prototype, k);

				if (opts && typeof opts.typeFactory === 'function') {
					type = opts.typeFactory();
				}

				acc[k] = makeSchema(type, k);
				return acc;
			}, {});

			if (!_fp.isEmpty(properties)) {
				definitionObj.properties = properties;
			}

			const required = _fp.flow(
				_fp.filter(({ optsFactory }: IPropDecoratorMetadata) => {
					const options = optsFactory() || {};
					return options.required;
				}),
				_fp.map('key')
			)(props);

			if (!_fp.isEmpty(required)) {
				definitionObj.required = required;
			}

			if (hasDefinitionDecoration) {
				definitions[title] = definitionObj;
				return {
					$ref: `#/definitions/${title}`
				};
			}

			return hasDefinitionDecoration
				? {
						$ref: `#/definitions/${title}`
				  }
				: definitionObj;
		}

		return null;
	};

	const schema = makeSchema(theClass);

	return { schema, definitions };
};

export const createSchemaDefinition = (theClass: Function) => {
	if (theClass) {
		const { definitions } = getSchemaDefinition(theClass);
		return definitions;
	}
	return {};
};

export default createSchemaDefinition;
