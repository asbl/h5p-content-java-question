import {
  JAVA_CATEGORY_FIELDS,
  JAVA_TOOLBOX,
} from './java-toolbox';
import { generateJavaFromBlocklyWorkspace } from './java-generator';
import { registerJavaOopBlocks } from './java-oop-blocks';
import {
  buildJavaGraphicsCategory,
  registerJavaGraphicsBlocks,
} from './java-graphics-blocks';
import {
  blocklyProjectClassRegistry,
  ProjectClassSymbolExtractor,
} from '../../../../H5P.LibCodeTools-6.0/src/scripts/editor/blockly/project-symbols';

function buildJavaProjectCategory(context = {}) {
  const classNames = new ProjectClassSymbolExtractor(context, {
    extension: '.java',
    entryFileName: context.entryFileName || 'Main.java',
  }).getClassNames();
  blocklyProjectClassRegistry.set('java', classNames);

  return {
    kind: 'category',
    name: 'Klassen',
    colour: '#3366AA',
    contents: [
      {
        kind: 'block',
        type: 'java_class_definition',
        fields: {
          CLASS_NAME: String(context.activeFileName || 'Helper.java').replace(/\.java$/i, '') || 'Helper',
        },
      },
      {
        kind: 'block',
        type: 'java_method_definition',
        fields: {
          RETURN_TYPE: 'int',
          METHOD_NAME: 'answer',
        },
      },
      {
        kind: 'block',
        type: 'java_return',
        inputs: {
          VALUE: {
            shadow: {
              type: 'math_number',
              fields: { NUM: 42 },
            },
          },
        },
      },
      ...classNames.flatMap((className) => [
        {
          kind: 'block',
          type: 'java_declare_object',
          fields: {
            VAR_NAME: className.charAt(0).toLowerCase() + className.slice(1),
            CLASS_NAME: className,
          },
        },
        {
          kind: 'block',
          type: 'java_new_object',
          fields: {
            CLASS_NAME: className,
          },
        },
      ]),
      {
        kind: 'block',
        type: 'java_method_call_value',
      },
      {
        kind: 'block',
        type: 'java_method_call_statement',
      },
    ],
  };
}

export const JAVA_BLOCKLY_LANGUAGE_PACK = {
  toolbox: JAVA_TOOLBOX,
  categoryFieldMap: JAVA_CATEGORY_FIELDS,
  generate: generateJavaFromBlocklyWorkspace,
  registerBlocks: (Blockly) => {
    registerJavaOopBlocks(Blockly);
    registerJavaGraphicsBlocks(Blockly);
  },
  buildDynamicCategories: (context) => [
    buildJavaGraphicsCategory(),
    buildJavaProjectCategory(context),
  ],
  supported: true,
};

export function registerJavaBlocklyLanguagePack() {
  H5P.registerBlocklyLanguagePack('java', JAVA_BLOCKLY_LANGUAGE_PACK);
}
