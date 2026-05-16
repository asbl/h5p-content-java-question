import {
  JAVA_CATEGORY_FIELDS,
  JAVA_TOOLBOX,
} from './java-toolbox';
import { generateJavaFromBlocklyWorkspace } from './java-generator';

export const JAVA_BLOCKLY_LANGUAGE_PACK = {
  toolbox: JAVA_TOOLBOX,
  categoryFieldMap: JAVA_CATEGORY_FIELDS,
  generate: generateJavaFromBlocklyWorkspace,
  supported: true,
};

export function registerJavaBlocklyLanguagePack() {
  H5P.registerBlocklyLanguagePack('java', JAVA_BLOCKLY_LANGUAGE_PACK);
}
