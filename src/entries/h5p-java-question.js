import '../styles/h5p-java-question.css';
import JavaQuestion from '../scripts/java-question';
import { registerJavaBlocklyLanguagePack } from '../scripts/blockly/java-blockly-language-pack';
// Load library
H5P.JavaQuestion = JavaQuestion;
registerJavaBlocklyLanguagePack();
