// Glosario de ingredientes: cómo se llama cada uno en cada país, a qué marcas
// conocidas equivale, cuánto pesa una taza o una unidad, y qué dieta lo excluye.
//
// Formato de cada entrada:
//   id, categoría, sinónimos en inglés | español | portugués, nombres por país, datos
// Datos: gml = g por ml (para tazas y cucharas), gu = g por unidad, gd = g por diente,
//   liquido = se mide en ml, vende = 'unidad' si se compra por unidad,
//   k = [kcal, proteína, carbohidratos, grasa] por 100 g, f = restricciones
//   (R carne, P pescado, M marisco, C cerdo, L lácteo, H huevo, G gluten, A otro animal),
//   desp = suele haber en casa, alt = alternativa más barata, sub = reemplazo por dieta,
//   dias = cuánto dura guardado, marcas = marcas que equivalen a este ingrediente,
//   excluir = palabras de variantes que no sirven en la tienda ("rubia" si se pide azúcar blanca),
//   notaPais = consejo cuando en un país no se consigue tal cual (texto, o función que recibe la cantidad en tazas).
import { normalizar, raices } from './texto-util.js'

const E = (id, cat, en, es, pt, local = {}, datos = {}) => ({ id, cat, en: en.split('|'), es: es.split('|'), pt: pt.split('|'), local, ...datos })

export const GLOSARIO = [
  // ---------- Pollo y carnes ----------
  E('pollo_pechuga', 'pollo', 'chicken breast|chicken breasts|boneless skinless chicken breast', 'pechuga de pollo|pechugas de pollo|pechuga', 'peito de frango', { BR: 'peito de frango' }, { gu: 220, k: [165, 31, 0, 3.6], f: 'R', dias: 2, sub: { vegana: 'garbanzo', vegetariana: 'garbanzo' }, alt: 'pollo_pierna' }),
  E('pollo_pierna', 'pollo', 'chicken thigh|chicken thighs|chicken legs|chicken drumsticks|drumsticks', 'pierna de pollo|muslo de pollo|muslos de pollo|encuentro de pollo|pata muslo', 'coxa de frango|sobrecoxa', { PE: 'pierna de pollo', MX: 'muslo de pollo', CO: 'pernil de pollo', AR: 'pata muslo de pollo', CL: 'trutro de pollo', ES: 'muslo de pollo', BR: 'sobrecoxa de frango' }, { gu: 150, k: [209, 26, 0, 11], f: 'R', dias: 2, sub: { vegana: 'garbanzo', vegetariana: 'garbanzo' } }),
  E('pollo_ala', 'pollo', 'chicken wings|chicken wing', 'alitas de pollo|alas de pollo', 'asa de frango', { PE: 'alitas de pollo', BR: 'asa de frango' }, { gu: 90, k: [203, 30, 0, 8], f: 'R', dias: 2 }),
  E('pollo', 'pollo', 'chicken|whole chicken|chicken pieces', 'pollo|pollo entero|presas de pollo', 'frango', { BR: 'frango' }, { gu: 1600, k: [215, 18, 0, 15], f: 'R', dias: 2, sub: { vegana: 'garbanzo', vegetariana: 'garbanzo' } }),
  E('pavo', 'pollo', 'turkey|ground turkey', 'pavo|carne de pavo', 'peru', {}, { k: [189, 29, 0, 7], f: 'R', dias: 2 }),
  E('carne_molida', 'carne_roja', 'ground beef|minced beef|beef mince|hamburger meat', 'carne molida|carne picada|molida de res', 'carne moida', { PE: 'carne molida', MX: 'carne molida de res', CO: 'carne molida', AR: 'carne picada', CL: 'carne molida', ES: 'carne picada', BR: 'carne moída' }, { k: [254, 17, 0, 20], f: 'R', dias: 2, sub: { vegana: 'lenteja', vegetariana: 'lenteja' } }),
  E('res_bistec', 'carne_roja', 'beef steak|steak|sirloin|flank steak|skirt steak|beef tenderloin|ribeye', 'bistec|filete de res|lomo de res|bife|churrasco|entraña|lomo fino|bisteck', 'bife|contrafile|fraldinha', { PE: 'bistec de res', MX: 'bistec de res', CO: 'carne de res para asar', AR: 'bife de chorizo', CL: 'filete de vacuno', ES: 'filete de ternera', BR: 'bife' }, { gu: 200, k: [250, 26, 0, 15], f: 'R', dias: 3, sub: { vegana: 'champinon', vegetariana: 'champinon' } }),
  E('res', 'carne_roja', 'beef|stew beef|beef chuck|chuck roast|brisket', 'carne de res|carne para guiso|asado|res|carne de vacuno|ternera', 'carne bovina|acem|patinho', { PE: 'carne de res para guiso', MX: 'carne de res para guisar', AR: 'carne para guiso', CL: 'carne de vacuno', ES: 'ternera para guisar', BR: 'carne para ensopado' }, { k: [250, 26, 0, 15], f: 'R', dias: 3, sub: { vegana: 'champinon', vegetariana: 'champinon' } }),
  E('cerdo', 'carne_roja', 'pork|pork loin|pork chops|pork shoulder|pork tenderloin', 'cerdo|carne de cerdo|chancho|lomo de cerdo|chuleta de cerdo|bondiola', 'carne de porco|lombo de porco|bisteca de porco', { PE: 'carne de cerdo', AR: 'carne de cerdo', CL: 'carne de cerdo', BR: 'lombo de porco' }, { k: [242, 27, 0, 14], f: 'RC', dias: 3, sub: { sin_cerdo: 'pollo_pechuga', vegana: 'garbanzo', vegetariana: 'garbanzo' } }),
  E('tocino', 'carne_roja', 'bacon', 'tocino|tocineta|panceta|beicon|bacon', 'bacon|toucinho', { PE: 'tocino', MX: 'tocino', CO: 'tocineta', AR: 'panceta', CL: 'tocino', ES: 'beicon', BR: 'bacon' }, { k: [541, 37, 1, 42], f: 'RC', dias: 7, sub: { sin_cerdo: 'pavo', vegana: 'champinon', vegetariana: 'champinon' } }),
  E('jamon', 'carne_roja', 'ham', 'jamon|jamón', 'presunto', { BR: 'presunto' }, { k: [145, 21, 1.5, 6], f: 'RC', dias: 5, sub: { sin_cerdo: 'pavo' } }),
  E('chorizo', 'carne_roja', 'chorizo|sausage|sausages|italian sausage', 'chorizo|salchicha|longaniza', 'linguica|linguiça|salsicha', { BR: 'linguiça' }, { gu: 80, k: [455, 24, 2, 38], f: 'RC', dias: 7, sub: { sin_cerdo: 'pavo' } }),
  // ---------- Pescados y mariscos ----------
  E('pescado', 'pescado_marisco', 'fish|white fish|fish fillet|fish fillets|cod|tilapia|halibut|sea bass', 'pescado|filete de pescado|tilapia|merluza|corvina|bacalao|reineta', 'peixe|file de peixe|tilapia|merluza', { PE: 'filete de pescado', BR: 'filé de peixe' }, { gu: 150, k: [105, 23, 0, 1], f: 'P', dias: 1, sub: { vegana: 'tofu', vegetariana: 'tofu' } }),
  E('salmon', 'pescado_marisco', 'salmon|salmon fillet|salmon fillets', 'salmon|salmón|filete de salmón', 'salmao|salmão', {}, { gu: 150, k: [208, 20, 0, 13], f: 'P', dias: 1, sub: { vegana: 'tofu', vegetariana: 'tofu' }, alt: 'pescado' }),
  E('atun', 'enlatado', 'tuna|canned tuna|tuna in water', 'atun|atún|atún en lata|filete de atún', 'atum', {}, { vende: 'unidad', gu: 140, k: [116, 26, 0, 1], f: 'P', dias: 2, sub: { vegana: 'garbanzo', vegetariana: 'garbanzo' } }),
  E('camaron', 'pescado_marisco', 'shrimp|shrimps|prawns|prawn', 'camaron|camarón|camarones|langostino|langostinos|gambas', 'camarao|camarão', { PE: 'langostino', MX: 'camarón', CO: 'camarón', AR: 'langostino', CL: 'camarón', ES: 'gambas', BR: 'camarão' }, { k: [99, 24, 0, 0.3], f: 'PM', dias: 1, sub: { sin_mariscos: 'pescado', vegana: 'champinon', vegetariana: 'champinon' } }),
  // ---------- Huevos y lácteos ----------
  E('huevo', 'huevo', 'egg|eggs|large eggs|egg yolk|egg yolks|egg white|egg whites', 'huevo|huevos|yema|yemas|clara|claras', 'ovo|ovos|gema|clara', { BR: 'ovos' }, { excluir: ['codorniz', 'pato', 'chocolate', 'pascua'], vende: 'unidad', gu: 55, k: [143, 13, 0.7, 9.5], f: 'H', dias: 21, sub: { vegana: 'linaza' } }),
  E('leche', 'lacteo', 'milk|whole milk|skim milk|2% milk', 'leche|leche entera|leche fresca|leche descremada', 'leite|leite integral', { BR: 'leite' }, { liquido: 1, gml: 1.03, k: [61, 3.2, 4.8, 3.3], f: 'L', dias: 5, sub: { vegana: 'leche_vegetal', sin_lactosa: 'leche_sin_lactosa' } }),
  E('leche_evaporada', 'lacteo', 'evaporated milk', 'leche evaporada', 'leite evaporado', {}, { liquido: 1, gml: 1.07, k: [134, 6.8, 10, 7.6], f: 'L', dias: 3, sub: { vegana: 'leche_coco', sin_lactosa: 'leche_sin_lactosa' }, marcas: 'gloria|ideal|carnation|pet' }),
  E('leche_condensada', 'lacteo', 'condensed milk|sweetened condensed milk', 'leche condensada', 'leite condensado', {}, { liquido: 1, gml: 1.3, k: [321, 8, 54, 9], f: 'L', dias: 7, marcas: 'nestle la lechera|la lechera|eagle brand|moça|moca' }),
  E('leche_sin_lactosa', 'lacteo', 'lactose free milk|lactose-free milk', 'leche sin lactosa|leche deslactosada', 'leite sem lactose', {}, { liquido: 1, gml: 1.03, k: [50, 3.2, 4.8, 1.5], f: 'L' }),
  E('leche_vegetal', 'bebida', 'almond milk|oat milk|soy milk|plant milk|non-dairy milk', 'leche de almendras|bebida de almendras|leche de avena|bebida de avena|leche de soya|leche vegetal|bebida vegetal', 'leite de amendoas|bebida vegetal|leite de aveia', { ES: 'bebida de avena', BR: 'bebida vegetal' }, { liquido: 1, gml: 1.02, k: [40, 1, 6, 1.5] }),
  E('crema_leche', 'lacteo', 'heavy cream|heavy whipping cream|whipping cream|double cream|cream|single cream|half and half', 'crema de leche|crema para batir|nata|nata para montar|crema doble|crema', 'creme de leite|nata', { PE: 'crema de leche', MX: 'crema para batir', CO: 'crema de leche', AR: 'crema de leche', CL: 'crema', ES: 'nata para montar', BR: 'creme de leite' }, { liquido: 1, gml: 1.0, k: [340, 2.8, 2.8, 36], f: 'L', dias: 5, sub: { vegana: 'leche_coco', sin_lactosa: 'leche_coco' } }),
  E('crema_acida', 'lacteo', 'sour cream|creme fraiche|crème fraîche', 'crema agria|crema ácida|crema mexicana|crème fraîche', 'creme azedo', { PE: 'crema agria', MX: 'crema ácida', AR: 'crema ácida' }, { gml: 1.0, k: [198, 2.4, 4.6, 19], f: 'L', dias: 7, sub: { vegana: 'yogur_vegetal', sin_lactosa: 'yogur_vegetal' } }),
  E('yogur', 'lacteo', 'yogurt|yoghurt|greek yogurt|plain yogurt', 'yogur|yogurt|yogur natural|yogur griego', 'iogurte|iogurte natural', { BR: 'iogurte natural' }, { gml: 1.05, k: [61, 3.5, 4.7, 3.3], f: 'L', dias: 10, sub: { vegana: 'yogur_vegetal', sin_lactosa: 'yogur_vegetal' } }),
  E('yogur_vegetal', 'lacteo', 'plant-based yogurt|coconut yogurt|vegan yogurt', 'yogur vegetal|yogur de coco|yogur vegano', 'iogurte vegetal', {}, { gml: 1.05, k: [90, 1, 8, 6] }),
  E('mantequilla', 'lacteo', 'butter|unsalted butter|salted butter|melted butter', 'mantequilla|manteca|mantequilla sin sal', 'manteiga|manteiga sem sal', { PE: 'mantequilla', MX: 'mantequilla', CO: 'mantequilla', AR: 'manteca', CL: 'mantequilla', ES: 'mantequilla', BR: 'manteiga' }, { gml: 0.96, k: [717, 0.9, 0.1, 81], f: 'L', dias: 30, sub: { vegana: 'margarina', sin_lactosa: 'margarina' }, alt: 'margarina' }),
  E('margarina', 'aceite_grasa', 'margarine|vegan butter', 'margarina', 'margarina', {}, { gml: 0.96, k: [717, 0.2, 0.7, 80], dias: 60 }),
  E('queso_crema', 'queso', 'cream cheese', 'queso crema|queso para untar|queso philadelphia', 'cream cheese|requeijao|requeijão|queijo cremoso', { ES: 'queso para untar', BR: 'cream cheese' }, { gml: 1.0, k: [342, 6, 4, 34], f: 'L', dias: 10, marcas: 'philadelphia|philly|kraft cream cheese' }),
  E('parmesano', 'queso', 'parmesan|parmesan cheese|parmigiano|parmigiano reggiano|grana padano|pecorino', 'queso parmesano|parmesano|queso rallado', 'queijo parmesao|parmesão|queijo ralado', { AR: 'queso rallado', BR: 'queijo parmesão' }, { gml: 0.4, k: [431, 38, 4, 29], f: 'L', dias: 30, sub: { vegana: 'levadura_nutricional' } }),
  E('mozzarella', 'queso', 'mozzarella|mozzarella cheese|shredded mozzarella', 'queso mozzarella|mozzarella|muzzarella', 'queijo mussarela|mussarela', { AR: 'muzzarella', BR: 'queijo mussarela' }, { gml: 0.45, k: [280, 28, 3, 17], f: 'L', dias: 10 }),
  E('cheddar', 'queso', 'cheddar|cheddar cheese|american cheese|monterey jack|colby', 'queso cheddar|queso amarillo|queso americano', 'queijo cheddar|queijo prato', { BR: 'queijo prato' }, { gml: 0.45, k: [403, 25, 1.3, 33], f: 'L', dias: 21, marcas: 'velveeta|kraft singles' }),
  E('queso_fresco', 'queso', 'feta|queso fresco|fresh cheese|ricotta|cottage cheese|paneer', 'queso fresco|queso blanco|requesón|ricota|ricotta|queso de cabra', 'queijo minas|queijo fresco|ricota', { PE: 'queso fresco', MX: 'queso fresco', CO: 'queso campesino', AR: 'queso cremoso', CL: 'quesillo', ES: 'queso fresco', BR: 'queijo minas' }, { gml: 0.5, k: [264, 14, 4, 21], f: 'L', dias: 7 }),
  E('queso', 'queso', 'cheese|swiss cheese|gouda|edam|provolone', 'queso|queso edam|queso gouda|queso fundido|queso andino|queso mantecoso', 'queijo|queijo gouda', {}, { gml: 0.45, k: [356, 25, 2, 27], f: 'L', dias: 14, sub: { vegana: 'levadura_nutricional' } }),
  E('levadura_nutricional', 'otro', 'nutritional yeast', 'levadura nutricional', 'levedura nutricional', {}, { gml: 0.3, k: [325, 50, 36, 4] }),
  // ---------- Verduras ----------
  E('papa', 'verdura', 'potato|potatoes|baby potatoes|russet potatoes|yukon gold potatoes|new potatoes|red potatoes', 'papa|papas|patata|patatas|papa blanca|papa amarilla|papa huayro|papa canchan', 'batata|batatas', { PE: 'papa blanca', ES: 'patata', BR: 'batata' }, { gu: 170, k: [77, 2, 17, 0.1], dias: 21 }),
  E('camote', 'verdura', 'sweet potato|sweet potatoes|yam|yams', 'camote|batata|boniato|moniato', 'batata doce|batata-doce', { PE: 'camote', MX: 'camote', CO: 'batata', AR: 'batata', CL: 'camote', ES: 'boniato', BR: 'batata-doce' }, { gu: 200, k: [86, 1.6, 20, 0.1], dias: 21 }),
  E('cebolla', 'verdura', 'onion|onions|yellow onion|white onion|brown onion', 'cebolla|cebollas|cebolla blanca', 'cebola|cebolas', { BR: 'cebola' }, { gu: 150, gml: 0.6, k: [40, 1.1, 9, 0.1], dias: 30 }),
  E('cebolla_roja', 'verdura', 'red onion|red onions|purple onion|shallot|shallots|challots|eschalot', 'cebolla roja|cebolla morada|cebolla colorada', 'cebola roxa', { PE: 'cebolla roja', MX: 'cebolla morada', AR: 'cebolla morada', CL: 'cebolla morada', ES: 'cebolla morada', BR: 'cebola roxa' }, { gu: 150, gml: 0.6, k: [40, 1.1, 9, 0.1], dias: 30 }),
  E('cebolla_china', 'verdura', 'green onion|green onions|scallion|scallions|spring onion|spring onions|chives', 'cebolla china|cebollín|cebolleta|cebolla de verdeo|cebolla larga|cebollino', 'cebolinha', { PE: 'cebolla china', MX: 'cebollín', CO: 'cebolla larga', AR: 'cebolla de verdeo', CL: 'cebollín', ES: 'cebolleta', BR: 'cebolinha' }, { gu: 15, gml: 0.25, k: [32, 1.8, 7, 0.2], dias: 7 }),
  E('ajo', 'verdura', 'garlic|garlic cloves|garlic clove|minced garlic', 'ajo|ajos|diente de ajo|dientes de ajo', 'alho', { BR: 'alho' }, { vende: 'unidad', gu: 45, gd: 5, dientes: 10, gml: 0.6, k: [149, 6.4, 33, 0.5], dias: 30 }),
  E('tomate', 'verdura', 'tomato|tomatoes|roma tomatoes|plum tomatoes|beefsteak tomatoes', 'tomate|tomates|jitomate|tomate italiano', 'tomate|tomates', { MX: 'jitomate' }, { gu: 120, gml: 0.7, k: [18, 0.9, 3.9, 0.2], dias: 7 }),
  E('tomate_cherry', 'verdura', 'cherry tomatoes|grape tomatoes', 'tomate cherry|tomates cherry|tomatitos', 'tomate cereja', {}, { gml: 0.6, k: [18, 0.9, 3.9, 0.2], dias: 7 }),
  E('tomate_lata', 'enlatado', 'canned tomatoes|diced tomatoes|crushed tomatoes|tomato sauce|tomato puree|passata|whole peeled tomatoes', 'tomate en lata|tomates pelados|tomate triturado|salsa de tomate|puré de tomate|tomate picado en lata', 'tomate pelado|molho de tomate|passata', { PE: 'salsa de tomate', MX: 'puré de tomate', AR: 'puré de tomate', CL: 'salsa de tomate', ES: 'tomate triturado', BR: 'molho de tomate' }, { vende: 'unidad', gu: 400, gml: 1.03, k: [32, 1.6, 7, 0.2], dias: 4 }),
  E('pasta_tomate', 'condimento_salsa', 'tomato paste', 'pasta de tomate|concentrado de tomate|extracto de tomate', 'extrato de tomate', { PE: 'pasta de tomate', MX: 'pasta de tomate', AR: 'extracto de tomate', CL: 'pasta de tomate', ES: 'concentrado de tomate', BR: 'extrato de tomate' }, { gml: 1.1, k: [82, 4.3, 19, 0.5], dias: 7 }),
  E('zanahoria', 'verdura', 'carrot|carrots', 'zanahoria|zanahorias', 'cenoura', { BR: 'cenoura' }, { gu: 70, gml: 0.55, k: [41, 0.9, 10, 0.2], dias: 21 }),
  E('apio', 'verdura', 'celery|celery stalk|celery stalks', 'apio|rama de apio', 'salsao|salsão|aipo', { BR: 'salsão' }, { gu: 40, gml: 0.5, k: [16, 0.7, 3, 0.2], dias: 14 }),
  E('vainita', 'verdura', 'green beans|string beans|french beans|haricots verts', 'vainitas|vainita|ejotes|habichuelas|chauchas|porotos verdes|judías verdes', 'vagem|vagens', { PE: 'vainita', MX: 'ejote', CO: 'habichuela', AR: 'chaucha', CL: 'poroto verde', EC: 'vainita', BO: 'vainita', ES: 'judía verde', BR: 'vagem' }, { gml: 0.45, k: [31, 1.8, 7, 0.2], dias: 7 }),
  E('arveja', 'verdura', 'peas|green peas|frozen peas|sweet peas', 'arvejas|arveja|chícharos|guisantes|petit pois', 'ervilha|ervilhas', { PE: 'arveja', MX: 'chícharo', CO: 'arveja', AR: 'arveja', CL: 'arveja', ES: 'guisante', BR: 'ervilha' }, { gml: 0.6, k: [81, 5.4, 14, 0.4], dias: 5 }),
  E('choclo', 'verdura', 'corn|sweet corn|corn kernels|corn on the cob|ear of corn|ears of corn', 'choclo|elote|maíz|mazorca|granos de maíz|maíz dulce', 'milho|milho verde', { PE: 'choclo', MX: 'elote', CO: 'mazorca', AR: 'choclo', CL: 'choclo', ES: 'maíz dulce', BR: 'milho verde' }, { gu: 250, gml: 0.65, k: [86, 3.3, 19, 1.4], dias: 5 }),
  E('zapallo', 'verdura', 'pumpkin|butternut squash|squash|winter squash', 'zapallo|calabaza|ahuyama|auyama|zapallo loche', 'abobora|abóbora', { PE: 'zapallo', MX: 'calabaza', CO: 'ahuyama', AR: 'zapallo', CL: 'zapallo', ES: 'calabaza', BR: 'abóbora' }, { gml: 0.5, k: [26, 1, 6.5, 0.1], dias: 14 }),
  E('zapallito', 'verdura', 'zucchini|zucchinis|courgette|courgettes', 'zapallito italiano|calabacita|calabacín|zucchini|zapallo italiano', 'abobrinha', { PE: 'zapallito italiano', MX: 'calabacita', CO: 'zucchini', AR: 'zucchini', CL: 'zapallo italiano', ES: 'calabacín', BR: 'abobrinha' }, { gu: 200, gml: 0.5, k: [17, 1.2, 3.1, 0.3], dias: 7 }),
  E('pimiento', 'verdura', 'bell pepper|bell peppers|red pepper|green pepper|red bell pepper|green bell pepper|capsicum', 'pimiento|pimientos|pimiento morrón|morrón|pimentón', 'pimentao|pimentão', { PE: 'pimiento', MX: 'pimiento morrón', CO: 'pimentón', AR: 'morrón', CL: 'pimentón', ES: 'pimiento', BR: 'pimentão' }, { gu: 160, gml: 0.6, k: [26, 1, 6, 0.3], dias: 10 }),
  E('aji', 'verdura', 'chili|chilies|chili pepper|chile|jalapeno|jalapeño|jalapeno pepper|serrano|hot pepper|red chili|green chili|thai chili|habanero|habanero pepper|scotch bonnet|chipotle|red chilli|green chilli|chilli', 'ají|ajíes|chile|chiles|jalapeño|guindilla|rocoto|ají limo|ají amarillo|chile serrano', 'pimenta|pimenta dedo-de-moca|pimenta malagueta', { PE: 'ají amarillo', MX: 'chile serrano', CO: 'ají', AR: 'ají', CL: 'ají verde', ES: 'guindilla', BR: 'pimenta dedo-de-moça' }, { gu: 20, k: [40, 2, 9, 0.4], dias: 14 }),
  E('lechuga', 'verdura', 'lettuce|romaine|romaine lettuce|iceberg lettuce|mixed greens|salad greens', 'lechuga|lechuga romana|lechuga americana', 'alface', { BR: 'alface' }, { gu: 400, gml: 0.2, k: [15, 1.4, 2.9, 0.2], dias: 5 }),
  E('espinaca', 'verdura', 'spinach|baby spinach', 'espinaca|espinacas', 'espinafre', { BR: 'espinafre' }, { gml: 0.2, k: [23, 2.9, 3.6, 0.4], dias: 5 }),
  E('brocoli', 'verdura', 'broccoli|broccoli florets', 'brócoli|brocoli|brécol', 'brocolis|brócolis', { BR: 'brócolis' }, { gu: 350, gml: 0.35, k: [34, 2.8, 7, 0.4], dias: 7 }),
  E('coliflor', 'verdura', 'cauliflower', 'coliflor', 'couve-flor|couve flor', { BR: 'couve-flor' }, { gu: 600, gml: 0.4, k: [25, 1.9, 5, 0.3], dias: 7 }),
  E('repollo', 'verdura', 'cabbage|green cabbage|red cabbage', 'repollo|col|col blanca', 'repolho', { PE: 'col', MX: 'col', CO: 'repollo', AR: 'repollo', CL: 'repollo', ES: 'col', BR: 'repolho' }, { gu: 900, gml: 0.3, k: [25, 1.3, 6, 0.1], dias: 14 }),
  E('pepino', 'verdura', 'cucumber|cucumbers', 'pepino|pepinillo', 'pepino', {}, { gu: 300, k: [15, 0.7, 3.6, 0.1], dias: 7 }),
  E('champinon', 'verdura', 'mushroom|mushrooms|button mushrooms|cremini mushrooms|portobello', 'champiñones|champiñón|hongos|setas|portobello', 'cogumelos|champignon', { PE: 'champiñones', MX: 'champiñones', CO: 'champiñones', AR: 'champiñones', CL: 'champiñones', ES: 'champiñones', BR: 'cogumelo paris' }, { gu: 18, gml: 0.3, k: [22, 3.1, 3.3, 0.3], dias: 5 }),
  E('berenjena', 'verdura', 'eggplant|eggplants|aubergine', 'berenjena|berenjenas', 'berinjela', { BR: 'berinjela' }, { gu: 300, k: [25, 1, 6, 0.2], dias: 7 }),
  E('betarraga', 'verdura', 'beet|beets|beetroot', 'betarraga|betabel|remolacha|beterraga', 'beterraba', { PE: 'betarraga', MX: 'betabel', CO: 'remolacha', AR: 'remolacha', CL: 'betarraga', ES: 'remolacha', BR: 'beterraba' }, { gu: 150, k: [43, 1.6, 10, 0.2], dias: 21 }),
  E('palta', 'fruta', 'avocado|avocados', 'palta|paltas|aguacate|aguacates', 'abacate', { PE: 'palta', MX: 'aguacate', CO: 'aguacate', AR: 'palta', CL: 'palta', EC: 'aguacate', BO: 'palta', ES: 'aguacate', BR: 'abacate' }, { gu: 200, k: [160, 2, 9, 15], dias: 5 }),
  // ---------- Hierbas y especias ----------
  E('perejil', 'verdura', 'parsley|fresh parsley|flat-leaf parsley|italian parsley', 'perejil', 'salsinha', { BR: 'salsinha' }, { vende: 'unidad', gu: 60, gml: 0.25, k: [36, 3, 6, 0.8], dias: 7 }),
  E('cilantro', 'verdura', 'cilantro|coriander leaves|fresh coriander', 'cilantro|culantro', 'coentro', { PE: 'culantro', BR: 'coentro' }, { vende: 'unidad', gu: 60, gml: 0.25, k: [23, 2, 4, 0.5], dias: 7 }),
  E('albahaca', 'verdura', 'basil|fresh basil|basil leaves', 'albahaca', 'manjericao|manjericão', { BR: 'manjericão' }, { vende: 'unidad', gu: 30, gml: 0.2, k: [23, 3, 2.7, 0.6], dias: 5 }),
  E('hierbabuena', 'verdura', 'mint|fresh mint|mint leaves', 'hierbabuena|menta', 'hortela|hortelã', { BR: 'hortelã' }, { vende: 'unidad', gu: 30, gml: 0.2, k: [44, 3.3, 8, 0.7], dias: 5 }),
  E('kion', 'verdura', 'ginger|fresh ginger|ginger root|ground ginger', 'jengibre|kion|kión', 'gengibre', { PE: 'kion', BR: 'gengibre' }, { gu: 50, gml: 0.5, k: [80, 1.8, 18, 0.8], dias: 21 }),
  E('oregano', 'especia_hierba', 'oregano|dried oregano', 'orégano|oregano', 'oregano|orégano', {}, { gml: 0.25, k: [265, 9, 69, 4], desp: 1, dias: 365 }),
  E('tomillo', 'especia_hierba', 'thyme|dried thyme|fresh thyme', 'tomillo', 'tomilho', {}, { gml: 0.3, k: [101, 5.6, 24, 1.7], dias: 365 }),
  E('romero', 'especia_hierba', 'rosemary|fresh rosemary|dried rosemary', 'romero', 'alecrim', {}, { gml: 0.3, k: [131, 3.3, 21, 6], dias: 365 }),
  E('laurel', 'especia_hierba', 'bay leaf|bay leaves', 'laurel|hoja de laurel|hojas de laurel', 'louro|folha de louro', {}, { vende: 'unidad', gu: 0.2, k: [313, 7.6, 75, 8], desp: 1, dias: 365 }),
  E('comino', 'especia_hierba', 'cumin|ground cumin|cumin seeds', 'comino|comino molido', 'cominho', {}, { gml: 0.5, k: [375, 18, 44, 22], desp: 1, dias: 365 }),
  E('pimenton', 'especia_hierba', 'paprika|smoked paprika|sweet paprika', 'pimentón|páprika|paprika|pimentón dulce|pimentón ahumado', 'paprica|páprica', { PE: 'páprika', MX: 'paprika', AR: 'pimentón', CL: 'paprika', ES: 'pimentón', BR: 'páprica' }, { gml: 0.45, k: [282, 14, 54, 13], dias: 365 }),
  E('aji_polvo', 'especia_hierba', 'chili powder|cayenne|cayenne pepper|red pepper flakes|crushed red pepper|chili flakes', 'ají en polvo|chile en polvo|pimienta de cayena|ají molido|hojuelas de chile', 'pimenta calabresa|pimenta caiena', { PE: 'ají panca en polvo', MX: 'chile en polvo', AR: 'ají molido', BR: 'pimenta calabresa' }, { gml: 0.45, k: [282, 13, 50, 14], dias: 365 }),
  E('canela', 'especia_hierba', 'cinnamon|ground cinnamon|cinnamon stick|cinnamon sticks', 'canela|canela molida|canela en rama', 'canela', {}, { gml: 0.55, k: [247, 4, 81, 1.2], desp: 1, dias: 365 }),
  E('nuez_moscada', 'especia_hierba', 'nutmeg|ground nutmeg', 'nuez moscada', 'noz-moscada|noz moscada', {}, { gml: 0.5, k: [525, 6, 49, 36], dias: 365 }),
  E('clavo', 'especia_hierba', 'whole cloves|ground cloves', 'clavo de olor|clavos de olor', 'cravo|cravo-da-india', {}, { gml: 0.45, k: [274, 6, 66, 13], dias: 365 }),
  E('curry', 'especia_hierba', 'curry powder|garam masala|turmeric|ground turmeric', 'curry|curry en polvo|cúrcuma|palillo|garam masala', 'curry|curcuma|açafrão-da-terra', { PE: 'palillo' }, { gml: 0.45, k: [325, 14, 58, 14], dias: 365 }),
  E('pimienta', 'especia_hierba', 'black pepper|pepper|ground black pepper|freshly ground black pepper|white pepper', 'pimienta|pimienta negra|pimienta molida', 'pimenta-do-reino|pimenta do reino', { BR: 'pimenta-do-reino' }, { gml: 0.45, k: [251, 10, 64, 3], desp: 1, dias: 365 }),
  E('sal', 'condimento_salsa', 'salt|kosher salt|sea salt|table salt|flaky salt', 'sal|sal de mesa|sal marina|sal gruesa', 'sal|sal grosso', {}, { gml: 1.2, k: [0, 0, 0, 0], desp: 1, dias: 3650 }),
  E('caldo_cubo', 'condimento_salsa', 'bouillon cube|bouillon cubes|stock cube|stock cubes|chicken bouillon|beef bouillon', 'cubito de caldo|caldo en cubo|cubo de caldo|caldo de gallina en cubo', 'caldo em tablete|tablete de caldo', { PE: 'caldo de gallina en cubo', MX: 'consomé de pollo', AR: 'caldo en cubo', BR: 'caldo de galinha' }, { vende: 'unidad', gu: 10, k: [250, 10, 20, 15], dias: 365, marcas: 'maggi|knorr|rapidito|doña gusta' }),
  E('caldo', 'condimento_salsa', 'chicken broth|chicken stock|beef broth|beef stock|vegetable broth|vegetable stock|broth|stock', 'caldo de pollo|caldo de res|caldo de verduras|caldo|fondo', 'caldo de galinha|caldo de legumes|caldo', {}, { liquido: 1, gml: 1, k: [7, 1, 0.5, 0.2], dias: 4, nota: 'Lo puedes hacer con agua caliente y un cubito.' }),
  // ---------- Frutas ----------
  E('limon', 'fruta', 'lime|limes|lime juice', 'limón|limones|lima|jugo de limón|zumo de lima', 'limao|limão|limão taiti', { PE: 'limón', MX: 'limón', CO: 'limón', AR: 'lima', CL: 'limón', ES: 'lima', BR: 'limão taiti' }, { vende: 'unidad', gu: 45, gml: 1.03, k: [30, 0.7, 11, 0.2], dias: 14 }),
  E('limon_amarillo', 'fruta', 'lemon|lemons|lemon juice|lemon zest', 'limón amarillo|limón real|limón|zumo de limón', 'limao siciliano|limão siciliano', { PE: 'limón', MX: 'limón amarillo', CO: 'limón', AR: 'limón', CL: 'limón', ES: 'limón', BR: 'limão siciliano' }, { vende: 'unidad', gu: 100, gml: 1.03, k: [29, 1.1, 9, 0.3], dias: 14 }),
  E('naranja', 'fruta', 'orange|oranges|orange juice|orange zest', 'naranja|naranjas|jugo de naranja', 'laranja|suco de laranja', { BR: 'laranja' }, { vende: 'unidad', gu: 180, gml: 1.04, k: [47, 0.9, 12, 0.1], dias: 14 }),
  E('platano', 'fruta', 'banana|bananas', 'plátano|plátanos|banano|banana|cambur', 'banana', { PE: 'plátano', MX: 'plátano', CO: 'banano', AR: 'banana', CL: 'plátano', ES: 'plátano', BR: 'banana' }, { vende: 'unidad', gu: 120, k: [89, 1.1, 23, 0.3], dias: 5 }),
  E('manzana', 'fruta', 'apple|apples', 'manzana|manzanas', 'maca|maçã', { BR: 'maçã' }, { vende: 'unidad', gu: 180, k: [52, 0.3, 14, 0.2], dias: 21 }),
  E('fresa', 'fruta', 'strawberry|strawberries', 'fresa|fresas|frutilla|frutillas', 'morango|morangos', { PE: 'fresa', MX: 'fresa', CO: 'fresa', AR: 'frutilla', CL: 'frutilla', ES: 'fresa', BR: 'morango' }, { gml: 0.6, k: [32, 0.7, 7.7, 0.3], dias: 4 }),
  E('pina', 'fruta', 'pineapple', 'piña|ananá', 'abacaxi', { AR: 'ananá', BR: 'abacaxi' }, { vende: 'unidad', gu: 1500, gml: 0.65, k: [50, 0.5, 13, 0.1], dias: 5 }),
  E('mango', 'fruta', 'mango|mangoes|mangos', 'mango|mangos', 'manga', { BR: 'manga' }, { vende: 'unidad', gu: 300, k: [60, 0.8, 15, 0.4], dias: 5 }),
  E('durazno', 'fruta', 'peach|peaches', 'durazno|duraznos|melocotón', 'pessego|pêssego', { ES: 'melocotón', BR: 'pêssego' }, { vende: 'unidad', gu: 150, k: [39, 0.9, 10, 0.3], dias: 5 }),
  E('arandano', 'fruta', 'blueberries|blueberry|berries|raspberries|blackberries', 'arándanos|arándano|frutos rojos|frambuesas|moras', 'mirtilo|frutas vermelhas', {}, { gml: 0.6, k: [57, 0.7, 14, 0.3], dias: 7 }),
  E('pasas', 'frutos_secos', 'raisins|dried cranberries|craisins', 'pasas|uvas pasas|pasitas|arándanos secos', 'uva-passa|uvas passas', {}, { gml: 0.6, k: [299, 3, 79, 0.5], dias: 180 }),
  E('coco', 'fruta', 'shredded coconut|desiccated coconut|coconut flakes', 'coco rallado|coco deshidratado', 'coco ralado', {}, { gml: 0.35, k: [660, 7, 24, 65], dias: 180 }),
  E('leche_coco', 'enlatado', 'coconut milk|coconut cream', 'leche de coco|crema de coco', 'leite de coco', {}, { vende: 'unidad', gu: 400, liquido: 1, gml: 1, k: [197, 2, 3, 21], dias: 4 }),
  // ---------- Abarrotes ----------
  E('arroz', 'pasta_arroz', 'rice|white rice|long grain rice|jasmine rice|basmati rice|cooked rice', 'arroz|arroz blanco|arroz extra|arroz cocido', 'arroz|arroz branco', {}, { gml: 0.8, k: [360, 7, 79, 0.6], dias: 365, desp: 0 }),
  E('quinua', 'pasta_arroz', 'quinoa', 'quinua|quinoa', 'quinoa', { PE: 'quinua', BO: 'quinua' }, { gml: 0.75, k: [368, 14, 64, 6], dias: 365 }),
  E('pasta', 'pasta_arroz', 'pasta|spaghetti|penne|fettuccine|linguine|macaroni|rigatoni|fusilli|noodles|egg noodles|lasagna noodles|lasagne sheets', 'pasta|fideos|tallarines|espagueti|spaghetti|macarrones|tallarín|lasaña|láminas de lasaña|fideo', 'macarrao|macarrão|espaguete|massa', { PE: 'fideo spaghetti', MX: 'pasta spaghetti', CO: 'pasta spaghetti', AR: 'fideos spaghetti', CL: 'fideos spaghetti', ES: 'espaguetis', BR: 'macarrão espaguete' }, { gml: 0.45, k: [371, 13, 75, 1.5], f: 'G', dias: 365, sub: { sin_gluten: 'pasta_sin_gluten' } }),
  E('pasta_sin_gluten', 'pasta_arroz', 'gluten-free pasta|rice noodles|rice pasta', 'pasta sin gluten|fideos de arroz|tallarín de arroz', 'macarrão sem glúten|macarrão de arroz', {}, { gml: 0.45, k: [360, 7, 80, 1.5], dias: 365 }),
  E('harina', 'cereal_harina', 'flour|all-purpose flour|all purpose flour|plain flour|bread flour|wheat flour|self-rising flour', 'harina|harina de trigo|harina sin preparar|harina preparada|harina 0000|harina común', 'farinha|farinha de trigo', { PE: 'harina sin preparar', AR: 'harina 0000', BR: 'farinha de trigo' }, { gml: 0.53, k: [364, 10, 76, 1], f: 'G', dias: 180, sub: { sin_gluten: 'harina_sin_gluten' } }),
  E('harina_pastelera', 'cereal_harina', 'cake flour|pastry flour|cake and pastry flour', 'harina pastelera|harina para pastel|harina para repostería|harina de repostería|harina de pastelería', 'farinha para bolo|farinha de confeitaria', { PE: 'harina sin preparar', MX: 'harina para pastel', CO: 'harina para tortas', AR: 'harina 0000', CL: 'harina sin polvos de hornear', ES: 'harina de repostería', BR: 'farinha para bolo' }, { gml: 0.48, k: [362, 8, 78, 1], f: 'G', dias: 180, sub: { sin_gluten: 'harina_sin_gluten' }, alt: 'harina', notaPais: { PE: (tazas) => `En Perú no se vende harina pastelera. Para esa parte (${tazas.texto}) usa harina sin preparar y cambia ${tazas.cucharadas} cucharadas de esa harina por ${tazas.cucharadas} de maicena. No uses "harina preparada": ya trae polvo de hornear.` } }),
  E('harina_sin_gluten', 'cereal_harina', 'gluten-free flour|rice flour|almond flour', 'harina sin gluten|harina de arroz|harina de almendras', 'farinha sem glúten|farinha de arroz', {}, { gml: 0.55, k: [366, 6, 80, 1.4], dias: 180 }),
  E('maicena', 'cereal_harina', 'cornstarch|corn starch|cornflour', 'maicena|fécula de maíz|almidón de maíz', 'amido de milho|maisena', { BR: 'amido de milho' }, { gml: 0.53, k: [381, 0.3, 91, 0.1], dias: 365 }),
  E('avena', 'cereal_harina', 'oats|rolled oats|old-fashioned oats|quick oats|oatmeal', 'avena|hojuelas de avena|avena en hojuelas', 'aveia|aveia em flocos', {}, { gml: 0.36, k: [389, 17, 66, 7], dias: 365 }),
  E('pan_rallado', 'panaderia', 'breadcrumbs|bread crumbs|panko', 'pan rallado|pan molido|panko', 'farinha de rosca|pão ralado', { PE: 'pan rallado', MX: 'pan molido', AR: 'pan rallado', ES: 'pan rallado', BR: 'farinha de rosca' }, { gml: 0.45, k: [395, 13, 72, 5], f: 'G', dias: 180, sub: { sin_gluten: 'avena' } }),
  E('pan', 'panaderia', 'bread|sandwich bread|baguette|sourdough|bread slices|buns|hamburger buns|rolls', 'pan|pan de molde|baguette|pan francés|pan de hamburguesa|marraqueta|bolillo', 'pao|pão|pão de forma', { PE: 'pan de molde', MX: 'pan de caja', AR: 'pan lactal', CL: 'pan de molde', ES: 'pan de molde', BR: 'pão de forma' }, { vende: 'unidad', gu: 30, k: [265, 9, 49, 3.2], f: 'G', dias: 5 }),
  E('tortilla', 'panaderia', 'tortillas|flour tortillas|corn tortillas|wraps', 'tortillas|tortillas de maíz|tortillas de harina|wraps', 'tortilhas|wrap', { MX: 'tortillas de maíz' }, { vende: 'unidad', gu: 35, k: [218, 6, 45, 3], dias: 7 }),
  E('azucar', 'azucar_dulce', 'sugar|white sugar|granulated sugar|caster sugar', 'azúcar|azúcar blanca|azúcar refinada', 'acucar|açúcar|açúcar refinado', { PE: 'azúcar blanca', CO: 'azúcar blanca', BR: 'açúcar refinado' }, { excluir: ['rubia', 'morena', 'moreno', 'mascabo', 'impalpable', 'glas', 'glass', 'flor', 'polvo', 'light', 'stevia', 'panela', 'mascavo', 'confeiteiro'], gml: 0.85, k: [387, 0, 100, 0], desp: 1, dias: 3650 }),
  E('azucar_rubia', 'azucar_dulce', 'brown sugar|light brown sugar|dark brown sugar|packed brown sugar|muscovado', 'azúcar rubia|azúcar morena|azúcar moreno|azúcar mascabo|panela|chancaca', 'açúcar mascavo|acucar mascavo', { PE: 'azúcar rubia', MX: 'azúcar morena', CO: 'panela', AR: 'azúcar mascabo', CL: 'azúcar rubia', ES: 'azúcar moreno', BR: 'açúcar mascavo' }, { gml: 0.9, k: [380, 0, 98, 0], dias: 3650, excluir: ['blanca', 'refinada', 'impalpable', 'glas', 'flor'] }),
  E('azucar_polvo', 'azucar_dulce', 'powdered sugar|icing sugar|confectioners sugar|confectioners\' sugar', 'azúcar en polvo|azúcar impalpable|azúcar glas|azúcar glass|azúcar flor', 'açúcar de confeiteiro', { PE: 'azúcar en polvo', MX: 'azúcar glass', AR: 'azúcar impalpable', CL: 'azúcar flor', ES: 'azúcar glas', BR: 'açúcar de confeiteiro' }, { gml: 0.5, k: [389, 0, 100, 0], dias: 3650 }),
  E('miel', 'azucar_dulce', 'honey|maple syrup|agave syrup|agave nectar|golden syrup', 'miel|miel de abeja|jarabe de arce|miel de maple|sirope de agave', 'mel|xarope de bordo', {}, { gml: 1.42, k: [304, 0.3, 82, 0], f: 'A', dias: 3650, sub: { vegana: 'azucar_rubia' } }),
  E('vainilla', 'condimento_salsa', 'vanilla|vanilla extract|vanilla essence', 'esencia de vainilla|extracto de vainilla|vainilla', 'essencia de baunilha|extrato de baunilha', { PE: 'esencia de vainilla', BR: 'essência de baunilha' }, { liquido: 1, gml: 0.88, k: [288, 0, 13, 0], dias: 3650 }),
  E('polvo_hornear', 'cereal_harina', 'baking powder', 'polvo de hornear|polvo para hornear|levadura química|polvo royal', 'fermento em po|fermento em pó|fermento químico', { PE: 'polvo de hornear', MX: 'polvo para hornear', AR: 'polvo de hornear', CL: 'polvo de hornear', ES: 'levadura química', BR: 'fermento em pó' }, { gml: 0.9, k: [53, 0, 28, 0], dias: 365, marcas: 'royal|fleischmann' }),
  E('bicarbonato', 'cereal_harina', 'baking soda|bicarbonate of soda', 'bicarbonato|bicarbonato de sodio', 'bicarbonato de sodio|bicarbonato de sódio', {}, { gml: 1.1, k: [0, 0, 0, 0], dias: 3650 }),
  E('levadura', 'cereal_harina', 'yeast|active dry yeast|instant yeast|dry yeast', 'levadura|levadura seca|levadura instantánea', 'fermento biologico|fermento biológico', {}, { gml: 0.6, k: [325, 40, 41, 7.6], dias: 120 }),
  E('cacao', 'azucar_dulce', 'cocoa|cocoa powder|unsweetened cocoa powder', 'cacao en polvo|cocoa|cacao amargo', 'cacau em po|cacau em pó|chocolate em pó', {}, { gml: 0.36, k: [228, 20, 58, 14], dias: 365 }),
  E('chispas_chocolate', 'azucar_dulce', 'chocolate chips|semisweet chocolate chips|chocolate chunks|chocolate morsels|dark chocolate chips|milk chocolate chips|chocolate chip', 'chispas de chocolate|chips de chocolate|gotas de chocolate|chispitas de chocolate', 'gotas de chocolate|chips de chocolate', { PE: 'chispas de chocolate', MX: 'chispas de chocolate', CO: 'chips de chocolate', AR: 'chips de chocolate', CL: 'chips de chocolate', ES: 'pepitas de chocolate', BR: 'gotas de chocolate' }, { gml: 0.7, k: [480, 5, 63, 25], dias: 365, marcas: 'nestle toll house|toll house|hershey\'s chips' }),
  E('chocolate', 'azucar_dulce', 'chocolate|dark chocolate|semisweet chocolate|bittersweet chocolate|baking chocolate|unsweetened chocolate', 'chocolate|chocolate bitter|chocolate para taza|chocolate semiamargo|chocolate de cobertura|cobertura de chocolate', 'chocolate|chocolate meio amargo|chocolate para cobertura', { PE: 'chocolate bitter', MX: 'chocolate semiamargo', AR: 'chocolate semiamargo', CL: 'chocolate bitter', ES: 'chocolate negro', BR: 'chocolate meio amargo' }, { gml: 0.7, k: [546, 5, 61, 31], dias: 365, marcas: 'hershey|hershey\'s|baker\'s|ghirardelli' }),
  E('gelatina', 'azucar_dulce', 'gelatin|unflavored gelatin|jello|jell-o', 'gelatina|gelatina sin sabor|colapez', 'gelatina|gelatina incolor', {}, { vende: 'unidad', gu: 10, k: [335, 86, 0, 0], f: 'A', dias: 365, marcas: 'jell-o|jello|royal|knox' }),
  // ---------- Menestras y frutos secos ----------
  E('frejol', 'legumbre', 'beans|black beans|kidney beans|pinto beans|white beans|cannellini beans|navy beans', 'frijoles|frejoles|frijol|fríjol|porotos|alubias|judías blancas|frejol canario|frijoles negros', 'feijao|feijão|feijão preto|feijão carioca', { PE: 'frejol', MX: 'frijol', CO: 'fríjol', AR: 'porotos', CL: 'porotos', ES: 'alubias', BR: 'feijão' }, { gml: 0.8, k: [341, 22, 62, 1.4], dias: 365 }),
  E('garbanzo', 'legumbre', 'chickpeas|chickpea|garbanzo beans', 'garbanzos|garbanzo', 'grao-de-bico|grão-de-bico', { BR: 'grão-de-bico' }, { gml: 0.8, k: [364, 19, 61, 6], dias: 365 }),
  E('lenteja', 'legumbre', 'lentils|lentil|red lentils|brown lentils', 'lentejas|lenteja', 'lentilha|lentilhas', { BR: 'lentilha' }, { gml: 0.8, k: [353, 25, 60, 1], dias: 365 }),
  E('tofu', 'legumbre', 'tofu|firm tofu|extra firm tofu', 'tofu|queso de soya', 'tofu', {}, { k: [76, 8, 1.9, 4.8], dias: 5 }),
  E('linaza', 'frutos_secos', 'flaxseed|flax seed|ground flaxseed|chia seeds|flax egg', 'linaza|linaza molida|semillas de chía|chía', 'linhaça|linhaca|chia', {}, { gml: 0.6, k: [534, 18, 29, 42], dias: 180, nota: 'Por cada huevo: 1 cucharada de linaza molida + 3 cucharadas de agua, reposa 5 minutos.' }),
  E('mani', 'frutos_secos', 'peanuts|peanut|peanut butter|roasted peanuts', 'maní|cacahuate|cacahuete|mantequilla de maní|crema de cacahuate', 'amendoim|pasta de amendoim', { PE: 'maní', MX: 'cacahuate', CO: 'maní', AR: 'maní', CL: 'maní', ES: 'cacahuete', BR: 'amendoim' }, { gml: 0.6, k: [567, 26, 16, 49], dias: 180 }),
  E('nuez', 'frutos_secos', 'walnuts|walnut|pecans|pecan|chopped walnuts', 'nueces|nuez|pecanas|nuez pecana', 'nozes|noz|noz-peca', {}, { gml: 0.5, k: [654, 15, 14, 65], dias: 180 }),
  E('almendra', 'frutos_secos', 'almonds|almond|sliced almonds|slivered almonds', 'almendras|almendra|almendras fileteadas', 'amendoas|amêndoas', {}, { gml: 0.6, k: [579, 21, 22, 50], dias: 180 }),
  // ---------- Aceites, salsas y condimentos ----------
  E('aceite_oliva', 'aceite_grasa', 'olive oil|extra virgin olive oil|extra-virgin olive oil|evoo', 'aceite de oliva|aceite de oliva extra virgen', 'azeite|azeite de oliva|azeite extra virgem', { BR: 'azeite de oliva' }, { liquido: 1, gml: 0.92, k: [884, 0, 0, 100], dias: 365, alt: 'aceite' }),
  E('aceite', 'aceite_grasa', 'oil|vegetable oil|canola oil|sunflower oil|neutral oil|cooking oil|corn oil', 'aceite|aceite vegetal|aceite de girasol|aceite de canola', 'oleo|óleo|óleo de soja|óleo vegetal', { BR: 'óleo de soja' }, { liquido: 1, gml: 0.92, k: [884, 0, 0, 100], desp: 1, dias: 365 }),
  E('aceite_spray', 'aceite_grasa', 'cooking spray|nonstick spray|pam', 'aceite en spray|rociador de aceite', 'óleo em spray', {}, { liquido: 1, gml: 0.92, k: [884, 0, 0, 100], dias: 365, marcas: 'pam' }),
  E('manteca_vegetal', 'aceite_grasa', 'shortening|vegetable shortening|lard', 'manteca vegetal|manteca de cerdo|grasa vegetal', 'gordura vegetal|banha', {}, { gml: 0.9, k: [884, 0, 0, 100], dias: 365, marcas: 'crisco' }),
  E('vinagre', 'condimento_salsa', 'vinegar|white vinegar|apple cider vinegar|red wine vinegar|balsamic vinegar|rice vinegar', 'vinagre|vinagre blanco|vinagre de manzana|vinagre balsámico|vinagre tinto', 'vinagre|vinagre de maçã', {}, { liquido: 1, gml: 1.01, k: [18, 0, 0.6, 0], dias: 3650 }),
  E('sillao', 'condimento_salsa', 'soy sauce|tamari|shoyu|low sodium soy sauce', 'sillao|salsa de soya|salsa de soja|soya|shoyu', 'molho shoyu|shoyu|molho de soja', { PE: 'sillao', MX: 'salsa de soya', CO: 'salsa de soya', AR: 'salsa de soja', CL: 'salsa de soya', ES: 'salsa de soja', BR: 'molho shoyu' }, { liquido: 1, gml: 1.1, k: [53, 8, 5, 0.6], f: 'G', dias: 365 }),
  E('mostaza', 'condimento_salsa', 'mustard|dijon mustard|yellow mustard|whole grain mustard', 'mostaza|mostaza dijon', 'mostarda', {}, { gml: 1.05, k: [66, 4, 6, 3], dias: 180, marcas: 'french\'s|grey poupon' }),
  E('mayonesa', 'condimento_salsa', 'mayonnaise|mayo', 'mayonesa', 'maionese', {}, { gml: 0.95, k: [680, 1, 0.6, 75], f: 'H', dias: 60, marcas: 'hellmann\'s|hellmanns|best foods|kraft mayo|alacena' }),
  E('ketchup', 'condimento_salsa', 'ketchup|catsup', 'kétchup|ketchup|salsa de tomate kétchup', 'ketchup', {}, { gml: 1.15, k: [112, 1.7, 26, 0.1], dias: 180, marcas: 'heinz' }),
  E('salsa_picante', 'condimento_salsa', 'hot sauce|sriracha|tabasco|chili sauce', 'salsa picante|salsa de ají|salsa sriracha|tabasco', 'molho de pimenta|molho picante', {}, { liquido: 1, gml: 1.05, k: [11, 0.5, 1.8, 0.4], dias: 365, marcas: 'tabasco|sriracha|cholula|valentina|frank\'s redhot' }),
  E('salsa_inglesa', 'condimento_salsa', 'worcestershire sauce|worcestershire', 'salsa inglesa|salsa worcestershire', 'molho inglês', {}, { liquido: 1, gml: 1.1, k: [78, 0, 19, 0], f: 'P', dias: 365, marcas: 'lea & perrins|lea and perrins' }),
  E('vino_blanco', 'bebida', 'white wine|dry white wine', 'vino blanco', 'vinho branco', {}, { liquido: 1, gml: 0.99, k: [82, 0.1, 2.6, 0], dias: 5 }),
  E('vino_tinto', 'bebida', 'red wine|dry red wine', 'vino tinto', 'vinho tinto', {}, { liquido: 1, gml: 0.99, k: [85, 0.1, 2.6, 0], dias: 5 }),
  E('cerveza', 'bebida', 'beer|lager|stout', 'cerveza', 'cerveja', {}, { liquido: 1, gml: 1, k: [43, 0.5, 3.6, 0], f: 'G', dias: 5 }),
  E('agua', 'bebida', 'water|warm water|cold water|hot water|boiling water|ice water', 'agua|agua tibia|agua fría|agua caliente|agua hirviendo', 'agua|água|água morna', {}, { liquido: 1, gml: 1, k: [0, 0, 0, 0], desp: 1, sinCompra: 1 }),
  E('hielo', 'bebida', 'ice|ice cubes', 'hielo|cubos de hielo', 'gelo', {}, { k: [0, 0, 0, 0], desp: 1, sinCompra: 1 }),
]

// ---------- Búsqueda ----------
const INDICE = []
for (const ing of GLOSARIO) {
  const nombres = [...ing.en, ...ing.es, ...ing.pt, ...Object.values(ing.local), ...(ing.marcas ? ing.marcas.split('|') : [])]
  for (const n of nombres) {
    const r = raices(n)
    if (r.length) INDICE.push({ ing, raices: r, largo: r.join(' ').length, esMarca: Boolean(ing.marcas?.split('|').includes(n)) })
  }
}

export const porId = (id) => GLOSARIO.find((g) => g.id === id)

// Busca el ingrediente del glosario que mejor calza con un nombre ("2 boneless chicken thighs" → pollo_pierna).
export function buscarIngrediente(nombre) {
  const palabras = raices(nombre)
  if (!palabras.length) return null
  let mejor = null
  for (const entrada of INDICE) {
    // Todas las palabras del sinónimo deben estar, en orden, dentro del nombre.
    let desde = 0
    let ok = true
    for (const r of entrada.raices) {
      const i = palabras.indexOf(r, desde)
      if (i < 0) {
        ok = false
        break
      }
      desde = i + 1
    }
    if (!ok) continue
    const puntaje = entrada.largo + (entrada.raices.length > 1 ? 2 : 0)
    if (!mejor || puntaje > mejor.puntaje) mejor = { ing: entrada.ing, puntaje, marca: entrada.esMarca }
  }
  return mejor
}

// Nombre que se usa en ese país y en ese idioma.
export function nombreLocal(ing, pais, idioma = 'es') {
  if (idioma === 'en') return ing.en[0]
  if (idioma === 'pt' || pais === 'BR') return ing.local.BR ?? ing.pt[0]
  return ing.local[pais] ?? ing.es[0]
}

// Término para buscar en las tiendas de ese país (en el idioma de las tiendas).
export function terminoBusqueda(ing, pais) {
  if (pais === 'BR') return ing.local.BR ?? ing.pt[0]
  if (pais === 'US') return ing.en[0]
  return ing.local[pais] ?? ing.es[0]
}

export { normalizar }
