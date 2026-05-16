import {
  javaBlockToStatements,
  javaProcedureDefinitions,
} from './java-block-generators';
import { javaIndent } from './java-generator-utils';

export function generateJavaFromBlocklyWorkspace(workspace) {
  const topBlocks = workspace?.getTopBlocks?.(true) || [];
  const body = topBlocks
    .filter((block) => !block.outputConnection && !['procedures_defnoreturn', 'procedures_defreturn'].includes(block.type))
    .map((block) => javaBlockToStatements(block))
    .join('');
  const procedures = javaProcedureDefinitions(topBlocks);
  const generatedCode = `${body}\n${procedures}`;
  const usesScanner = generatedCode.includes('__h5pScanner');
  const usesUnsupportedHelper = generatedCode.includes('unsupportedBlock(');

  return [
    'public class Main {',
    usesScanner ? '    private static final java.util.Scanner __h5pScanner = new java.util.Scanner(System.in);' : '',
    usesScanner ? '' : '',
    '    public static void main(String[] args) {',
    javaIndent(body, 8),
    '    }',
    usesUnsupportedHelper ? '' : '',
    usesUnsupportedHelper ? '    private static <T> T unsupportedBlock(String blockType) {' : '',
    usesUnsupportedHelper ? '        throw new UnsupportedOperationException("Dieser Blockly-Block wird fuer Java noch nicht unterstuetzt: " + blockType);' : '',
    usesUnsupportedHelper ? '    }' : '',
    procedures ? `\n    ${procedures.replace(/\n/g, '\n    ')}` : '',
    '}',
  ].filter(Boolean).join('\n');
}
