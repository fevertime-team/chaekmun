import { handler } from '../server/http';
import { analyze } from '../server/services';
export default handler((b) => analyze({ articleId: b.articleId, level: b.level, text: b.text, personaIndex: b.personaIndex }));
