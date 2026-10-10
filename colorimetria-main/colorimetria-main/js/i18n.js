// js/i18n.js — Translation engine

const LANG = (function detect() {
  const saved = localStorage.getItem('colorimetria_idioma');
  if (saved) return saved;
  return (navigator.language || '').toLowerCase().startsWith('es') ? 'es' : 'en';
})();

let idiomaActual = LANG;

let _TRANS_CI = null; // case-insensitive map, built lazily
function _buildCI() {
  if (_TRANS_CI) return;
  _TRANS_CI = {};
  for (const k in TRANS) {
    _TRANS_CI[k.toLowerCase()] = k;
  }
}

const TRANS = {
  // ── Nav / Brand ──
  'Dashboard':                     'Dashboard',
  'Frutas':                        'Fruits',
  'Aromáticas':                    'Aromatics',
  'Configuración':                 'Settings',

  // ── Fruits page ──
  'ANÁLISIS DE MADURACIÓN DE FRUTAS':              'FRUIT RIPENING ANALYSIS',
  'Sistema inteligente de evaluación del estado de maduración':  'Intelligent ripeness evaluation system',
  'Piña':                          'Pineapple',
  'Cargando…':                     'Loading…',
  'Selecciona una fruta para ver sus datos':       'Select a fruit to view its data',
  '⚠ Debe crear un proveedor para cargar muestras': '⚠ You must create a supplier before loading samples',
  'Cargar Muestra Individual':     'Load Individual Sample',
  'Cargar Varias Muestras':        'Load Multiple Samples',
  'Selecciona una planta para ver sus datos':      'Select a plant to view its data',

  // ── Aromatics page ──
  'ANÁLISIS DE MADURACIÓN MEDIANTE LA PIGMENTACIÓN DE LAS PLANTAS AROMÁTICAS':  'RIPENING ANALYSIS THROUGH PIGMENTATION OF AROMATIC PLANTS',
  'Sistema inteligente de evaluación visual de pigmentación y aroma':           'Intelligent visual pigment and aroma evaluation system',

  // ── Panel headings ──
  'Últimas Muestras de Frutas':    'Latest Fruit Samples',
  'Últimas Muestras de Aromáticas':'Latest Aromatic Samples',
  'Distribución por estado de maduración':    'Distribution by ripening stage',
  'Distribución por estado de pigmentación':  'Distribution by pigmentation stage',
  'Distribución por nivel de confianza del modelo': 'Distribution by model confidence level',
  'Analizar Muestras Frutas':      'Analyze Fruit Samples',
  'Analizar Muestras Aromáticas':  'Analyze Aromatic Samples',
  'Últimos análisis realizados':   'Latest analyses performed',
  'Distribución dinámica por estado':  'Dynamic distribution by stage',
  'Distribución dinámica por estado de pigmentación': 'Dynamic distribution by pigmentation stage',
  'Parámetros Colorimétricos (L*a*b*)':  'Colorimetric Parameters (L*a*b*)',
  'Archivos de Origen':           'Source Files',
  'Reflectancias Espectrales (380-780 nm) λ':  'Spectral Reflectances (380-780 nm) λ',
  'Total':                         'Total',

  // ── KPI labels ──
  'Total Analizadas':              'Total Analyzed',
  'Pigmentación Óptima':           'Optimal Pigmentation',
  'En Proceso':                    'In Process',
  'Baja Pigmentación':             'Low Pigmentation',
  'Maduración Óptima':             'Optimal Ripening',
  'No Madura':                     'Not Ripe',

  // ── Table headers ──
  'Fecha':                         'Date',
  'Nombre Muestra':                'Sample Name',
  'Imagen':                        'Image',
  'Nivel Maduración':              'Ripening Level',
  'Nivel Pigmentación':            'Pigmentation Level',
  'Estado':                        'Status',
  'Confianza':                     'Confidence',
  '⚠':                             '⚠',
  'L*':                            'L*',
  'a*':                            'a*',
  'b*':                            'b*',
  'ΔE':                            'ΔE',
  'Hue°':                          'Hue°',
  'Chroma':                        'Chroma',
  'Archivo Origen':                'Source File',
  'Nivel':                         'Level',
  'Maduración':                    'Ripening',
  'Pigmentación':                  'Pigmentation',
  'Nombre':                        'Name',
  'NIT':                           'Tax ID',
  'Contacto':                      'Contact',
  'Ciudad':                        'City',
  'Acciones':                      'Actions',

  // ── Filter options ──
  '🔍 Buscar muestra…':            '🔍 Search sample…',
  'Por Nombre Muestra':            'By Sample Name',
  'Todos los estados':             'All statuses',
  'Cualquier Confianza':           'Any Confidence',
  'Cualquier confianza':           'Any confidence',
  'Alta (≥80%)':                   'High (≥80%)',
  'Media (50–79%)':                'Medium (50–79%)',
  'Baja (<50%)':                   'Low (<50%)',
  'L* — cualquier luminosidad':       'L* — Any lightness',
  'Hue° — cualquier tono':            'Hue° — any hue',
  'Cualquier luminosidad':         'Any lightness',
  'Oscuro (L* < 40)':             'Dark (L* < 40)',
  'Medio (40 ≤ L* < 70)':         'Medium (40 ≤ L* < 70)',
  'Claro (L* ≥ 70)':              'Light (L* ≥ 70)',
  'cualquier tono':               'any hue',
  'Amarillo (70°–110°)':          'Yellow (70°–110°)',
  'Amarillo (70°–89°)':           'Yellow (70°–89°)',
  'Verde (110°–160°)':            'Green (110°–160°)',
  'Verde (90°–160°)':             'Green (90°–160°)',
  'Otro':                          'Other',
  'Zona espectral — todas':        'Spectral zone — all',
  'UV cercano (380–430 nm)':      'Near UV (380–430 nm)',
  'UV cercano (390–430 nm)':      'Near UV (390–430 nm)',
  'Visible central (440–620 nm)':  'Central visible (440–620 nm)',
  'Rojo / IR cercano (630–780 nm)':'Red / Near IR (630–780 nm)',
  'Rojo / IR cercano (630–710 nm)':'Red / Near IR (630–710 nm)',
  'Por Fruta':                     'By Fruit',

  // ── Buttons ──
  '🗑️ Eliminar Muestras':         '🗑️ Delete Samples',
  '✕ Limpiar':                     '✕ Clear',
  'Cargar muestra individual':     'Load Individual Sample',

  // ── Status badges ──
  'Sin dato':                      'No data',
  'Óptima':                        'Optimal',
  'Baja':                          'Low',
  'Alta':                          'High',

  // ── Status tooltips ──
  'Hue < 62° — color naranja-amarillo intenso':   'Hue < 62° — intense orange-yellow color',
  'Hue 62°–70° — transición verde-amarillo':      'Hue 62°–70° — green-yellow transition',
  'Hue > 70° o medición anómala (L* bajo)':       'Hue > 70° or anomalous measurement (low L*)',
  'Hue > 143° — alta concentración de clorofila': 'Hue > 143° — high chlorophyll concentration',
  'Hue 122°–143° — pigmentación en desarrollo':   'Hue 122°–143° — developing pigmentation',
  'Hue < 122° — baja concentración de clorofila': 'Hue < 122° — low chlorophyll concentration',

  // ── Confidence tooltips ──
  'Confianza alta: medición espectralmente estable': 'High confidence: spectrally stable measurement',
  'Confianza media: revisar datos espectrales':      'Medium confidence: review spectral data',
  'Confianza baja: posible error de medición':       'Low confidence: possible measurement error',

  // ── Wizard ──
  '📋 Configuración inicial':      '📋 Initial Setup',
  'Nuevo proveedor':               'New supplier',
  'Cerrar':                        'Close',
  '1. Proveedor':                  '1. Supplier',
  '2. Categoría':                  '2. Category',
  '3. Tipo':                       '3. Type',
  '4. Sesión':                     '4. Session',
  'Cargando proveedores…':         'Loading suppliers…',
  '➕ Crear nuevo proveedor':      '➕ Create new supplier',
  'Ej: Proveedor ABC':            'Ex: Supplier ABC',
  'NIT (máx. 10 caracteres)':     'Tax ID (max 10 digits)',
  'Ej: 1234567890':                'Ex: 1234567890',
  'Bogotá D.C':                    'Bogotá D.C.',
  'Nombre del contacto':           'Contact name',
  'Teléfono (7–10 dígitos)':      'Phone (7–10 digits)',
  'Teléfono - Solo Números':       'Phone - Numbers Only',
  'Volver':                        'Back',
  'Atrás':                         'Back',
  'Siguiente':                     'Next',
  '¿Qué tipo de muestra vas a analizar?':  'What type of sample will you analyze?',
  'Selecciona el tipo':            'Select the type',
  'Cargando tipos…':               'Loading types…',
  'Configuración de sesión':       'Session setup',
  'Fecha de la sesión':            'Session date',
  'Nombre de la muestra':          'Sample name',
  'Ej: fruta1.1.1':                'Ex: fruit1.1.1',
  '✏️ Editar':                     '✏️ Edit',
  '💾 Guardar':                    '💾 Save',
  'Nombre Muestra con formato fruta1.1.1': 'Sample name in format fruit1.1.1',
  'Estados de maduración a evaluar':  'Ripening stages to evaluate',
  'Selecciona al menos un estado de maduración':  'Select at least one ripening stage',
  'Selecciona un archivo CSV':     'Select a CSV file',
  'Archivo CSV del colorímetro':   'Colorimeter CSV file',
  '📄 Seleccionar CSV':            '📄 Select CSV',
  '📄 Cargar CSV':                 '📄 Load CSV',
  'Ningún archivo seleccionado':   'No file selected',
  'Selecciona al menos una imagen':'Select at least one image',
  'Imágenes':                      'Images',
  '📁 Seleccionar imágenes':       '📁 Select images',
  'Ninguna imagen seleccionada':   'No image selected',
  'Asignar imágenes a archivos CSV':'Assign images to CSV files',
  'Asignar imágenes a muestras':   'Assign images to samples',
  '#':                             '#',
  'Nombre Archivo':                'File Name',
  'Imagen asignada':               'Assigned Image',
  'Muestra':                       'Sample',
  'Guardar Muestras':              'Save Samples',
  'Guardar Muestra':               'Save Sample',
  'Imagen de la muestra *':        'Sample image *',
  'Haz clic para seleccionar una imagen':  'Click to select an image',
  'JPG, PNG o WEBP':               'JPG, PNG or WEBP',
  'Selecciona una imagen':         'Select an image',

  // ── Shared modals ──
  'Cargar muestra':                'Load sample',
  'Cargar muestra de piña':        'Load pineapple sample',
  'Cargar muestra de aromática':   'Load aromatic sample',
  'Cargar Varias Muestras — Piña': 'Load Multiple Samples — Pineapple',
  'Cargar Varias Muestras — Aromáticas':'Load Multiple Samples — Aromatics',
  'Cancelar':                      'Cancel',
  '💾 Guardar muestra':            '💾 Save sample',
  '💾 Guardar muestras':           '💾 Save samples',
  'Seleccionar muestras a eliminar':'Select samples to delete',
  'Seleccionar todas':             'Select all',
  'Deseleccionar todas':           'Deselect all',
  'Cargando muestras…':            'Loading samples…',
  'Eliminar Muestras':             'Delete Samples',
  '⚠️ Confirmar eliminación':     '⚠️ Confirm deletion',
  'Una vez eliminadas las muestras seleccionadas se tendran que subir de nuevo.':'Once deleted, the selected samples will need to be uploaded again.',
  '🗑️ Eliminar':                   '🗑️ Delete',
  'Nuevo Proveedor':               'New Supplier',
  'Nombre *':                      'Name *',
  'NIT *':                         'Tax ID *',
  'Teléfono':                      'Phone',
  'Notas':                         'Notes',
  'Configuración de tipos':        'Type configuration',
  '🍓 Frutas':                     '🍓 Fruits',
  '🌿 Aromáticas':                 '🌿 Aromatics',
  'Guardar':                       'Save',
  '⚠️ Cambios sin guardar':       '⚠️ Unsaved changes',
  'Continuar':                     'Continue',
  'No se puede eliminar':          'Cannot delete',
  '🗑️':                            '🗑️',
  'Confirmar eliminación':         'Confirm deletion',
  'Análisis individual de muestra':'Individual sample analysis',
  'Cargar muestra':                'Load sample',
  'Análisis individual de muestra: ': 'Individual sample analysis: ',
  'Sin imagen':                    'Without image',
  'Imagen #':                      'Image #',

  // ── Config page ──
  '⚙️ Configuración del Sistema':  '⚙️ System Settings',
  '🏭 Proveedores':                '🏭 Suppliers',
  '🍍 Frutas':                     '🍍 Fruits',
  '🌿 Aromáticas':                 '🌿 Aromatics',
  'Gestión de Proveedores':        'Supplier Management',
  '+ Nuevo Proveedor':             '+ New Supplier',
  'Eliminar seleccionados':        'Delete selected',
  '🗑️ Eliminar seleccionados':    '🗑️ Delete selected',
  'Tipos de Frutas':               'Fruit Types',
  'Tipos de Aromáticas':           'Aromatic Types',
  'Editar Proveedor':              'Edit Supplier',
  'Editar proveedor':              'Edit supplier',

  // ── Wizard errors / info ──
  'El NIT solo debe contener números.':  'Tax ID must only contain numbers.',
  'El NIT no puede tener más de 10 dígitos.': 'Tax ID cannot exceed 10 digits.',
  'El teléfono solo debe contener números.':  'Phone must only contain numbers.',
  'El teléfono debe tener entre 7 y 10 dígitos.': 'Phone must be 7–10 digits.',
  'El nombre es obligatorio.':       'Name is required.',
  'El NIT es obligatorio.':          'Tax ID is required.',
  'Error al guardar.':               'Error saving.',
  'Error de conexión.':              'Connection error.',
  'Error de red':                    'Network error',
  'Importados: ':                    'Imported: ',
  'Errores:':                        'Errors:',
  ' CSV(s) importados correctamente.': ' CSV(s) imported successfully.',
  '💾 Guardar Cambios':              '💾 Save Changes',
  '✏️ Editar proveedor':             '✏️ Edit supplier',
  'En Desarrollo':                   'In Development',
  'Activo':                          'Active',
  'Cargar Muestra Individual — wizard': 'Load Individual Sample',
  'Cargar Varias Muestras — wizard':  'Load Multiple Samples',

  // ── Confirm dialog (wizard) ──
  'Hay cambios sin guardar en "Cargar Muestra Individual". Se perderán. ¿Continuar?':  'There are unsaved changes in "Load Individual Sample". They will be lost. Continue?',
  'Hay cambios sin guardar en "Cargar Varias Muestras". Se perderán. ¿Continuar?':     'There are unsaved changes in "Load Multiple Samples". They will be lost. Continue?',

  // ── Dashboard blank states ──
  'No hay frutas':                   'No fruits',
  'No hay plantas':                  'No plants',
  'No hay muestras para mostrar':    'No samples to display',
  'No hay datos individuales':       'No individual data',

  // ── Card labels ──
  'Nombre de la muestra:':           'Sample name:',
  'Nivel de maduración':             'Ripeness level',
  'Nivel de pigmentación':           'Pigmentation level',
  'Confianza del modelo':            'Model confidence',
  'Total: ':                         'Total: ',
  ' muestras':                       ' samples',

  // ── Alert text ──
  'medición en zona oscura. Revisar posicionamiento del colorímetro.':  'measurement in dark zone. Check colorimeter positioning.',
  'medición atípica para aromáticas. Verificar posicionamiento del colorímetro.':  'atypical measurement for aromatics. Check colorimeter positioning.',
  'la madurez del tejido interno puede diferir de la cáscara. Verificar visualmente.':  'internal tissue ripeness may differ from peel. Verify visually.',
  'la pigmentación medida puede no reflejar el estado visual. Verificar.':  'measured pigmentation may not reflect visual state. Verify.',

  // ── Provider / config messages ──
  'Sin Proveedores':                 'No Suppliers',
  'El proveedor ':                   'The supplier ',
  ' tiene datos asociados:':        ' has associated data:',
  'Elimina primero las muestras desde el módulo correspondiente antes de borrar el proveedor.':  'First delete the samples from the corresponding module before removing the supplier.',
  '¿Estás seguro de que deseas eliminar este proveedor?':  'Are you sure you want to delete this supplier?',
  'Los siguientes proveedores tienen datos asociados y <strong>no pueden eliminarse</strong>:':  'The following suppliers have associated data and <strong>cannot be deleted</strong>:',
  'Elimina primero sus muestras desde el módulo correspondiente.':  'First delete their samples from the corresponding module.',
  'Se eliminarán ':                   'Will delete ',
  ' proveedor(es) sin datos.':        ' supplier(s) without data.',
  'Los siguientes <strong>no</strong> se eliminarán porque tienen muestras asociadas:':  'The following will <strong>not</strong> be deleted because they have associated samples:',
  '¿Eliminar ':                       'Delete ',
  ' proveedor(es) seleccionado(s)?':  ' selected supplier(s)?',
  ' proveedor(es) seleccionado(s)? Esta acción no se puede deshacer.': ' selected supplier(s)? This action cannot be undone.',
  'Los proveedores sin datos fueron eliminados correctamente.':  'Suppliers without data were deleted successfully.',
  'Los siguientes proveedores <strong>no se eliminaron</strong> porque tienen muestras:':  'The following suppliers were <strong>not deleted</strong> because they have samples:',

  // ── Shared modals: lote validation ──
  'Completa el "Nombre de la muestra" para cada archivo CSV':  'Complete the "Sample Name" for each CSV file',
  'Selecciona al menos una imagen (obligatorio)':       'Select at least one image (required)',
  'Asigna las imagenes con su respectiva muestra':       'Assign images to their respective samples',
  'Faltan ':                        'Missing ',
  ' archivo(s) CSV por asignar una imagen':     ' CSV file(s) pending image assignment',
  'No puedes asignar la misma imagen a dos archivos CSV distintos':  'You cannot assign the same image to two different CSV files',
  'No puedes asignar la misma imagen a dos archivos distintos':      'You cannot assign the same image to two different files',
  'No puedes asignar la misma imagen a dos muestras distintas':      'You cannot assign the same image to two different samples',
  ' imágenes asignadas a ':          ' images assigned to ',
  ' archivos CSV':                   ' CSV files',
  'La cantidad de imágenes (':       'The number of images (',
  ') debe ser igual a la cantidad de archivos CSV (': ') must equal the number of CSV files (',
  ') debe ser igual a la cantidad de muestras pendientes (': ') must equal the number of pending samples (',
  ' imagen(es) por asignar':        ' image(s) pending assignment',
  ' imágenes asignadas correctamente a ':  ' images correctly assigned to ',
  ' muestra(s) en total':           ' sample(s) in total',
  ' archivo(s), ':                   ' file(s), ',
  ' imagen(es) seleccionada(s)':    ' image(s) selected',
  ' archivo(s) seleccionado(s)':    ' file(s) selected',
  ' imágenes asignadas a ':          ' images assigned to ',
  ' imagen(es) seleccionada(s)':    ' image(s) selected',

  // ── Upload / import ──
  'Importando datos…':               'Importing data…',
  'Subiendo imagen…':                'Uploading image…',
  'Error al subir la imagen.':       'Error uploading the image.',
  'Importando datos del CSV…':       'Importing CSV data…',
  'El CSV no contiene datos válidos.':  'The CSV does not contain valid data.',
  'Error al importar datos.':        'Error importing data.',
  'Error de conexión con el servidor.':  'Server connection error.',
  'Error de conexión con el servidor':   'Server connection error',
  'Error de conexión':               'Connection error',
  'Debes seleccionar una imagen, un CSV y un nombre de muestra.':  'You must select an image, a CSV, and a sample name.',
  'Ingresa un nombre para la muestra':  'Enter a name for the sample',
  'Ingresa un nombre, una imagen y un archivo CSV':  'Enter a name, an image, and a CSV file',
  'Selecciona una imagen (obligatorio)':  'Select an image (required)',
  'Selecciona un archivo CSV (obligatorio)':  'Select a CSV file (required)',
  'Subiendo imágenes…':              'Uploading images…',
  'Error al subir imágenes':         'Error uploading images',
  'Importando muestras…':            'Importing samples…',
  'Error en CSV #':                  'Error in CSV #',
  ' muestras importadas correctamente':  ' samples imported correctly',
  'Guardando asignaciones…':         'Saving assignments…',
  'Error al guardar asignaciones':   'Error saving assignments',
  'Formato no permitido. Usa JPG, PNG o WEBP.':  'Format not allowed. Use JPG, PNG or WEBP.',
  'La imagen supera el límite de 5MB.':  'Image exceeds the 5MB limit.',
  'Error al cargar muestras':        'Error loading samples',
  'Quitar CSV':                      'Remove CSV',
  'Eliminar':                        'Delete',
  ' y ':                             ' and ',
  ' más':                            ' more',
  'Error al cargar datos':           'Error loading data',
  'Ej: Fruta Dia 1':                 'Ex: Fruit Day 1',
  'Ej: Aromática Dia 1':             'Ex: Aromatic Day 1',
  'Carga un CSV para ver las muestras':  'Load a CSV to view the samples',
  'Carga un CSV con los datos de las muestras':  'Load a CSV with the sample data',
  'Cargando datos…':                 'Loading data…',

  // ── Selected / counter text ──
  ' seleccionada':                   ' selected',
  ' seleccionadas':                  ' selected',
  'Eliminando…':                     'Deleting…',
  'No se pudieron eliminar las muestras':  'Could not delete the samples',
  'La solicitud tardó demasiado. Intenta de nuevo.':  'The request timed out. Try again.',
  'muestra(s)':                      'sample(s)',
  ' de ':                            ' of ',
  'Muestra ':                        'Sample ',
  ' – Lado ':                        ' – Side ',
  ' – Toma ':                        ' – Take ',

  // ── Donut ──
  'Habilitar visualizar también las muestras con ⚠':  'Enable viewing samples with ⚠ as well',

  // ── Power BI ──
  'Curvas Espectrales de Reflectancia (400 - 700 nm) por Tipo de Fruta':  'Spectral Reflectance Curves (400-700 nm) by Fruit Type',
  'Perfil Colorimétrico: Comparativa de Tono (Hue), Croma e Índice de Color':  'Colorimetric Profile: Hue, Chroma and Color Index Comparison',
  'Comparativa: Croma vs. Índice de Color':  'Comparison: Chroma vs. Color Index',
  'Curvas Espectrales (400 - 700 nm) en Muestras de Plantas Aromáticas':  'Spectral Curves (400-700 nm) in Aromatic Plant Samples',
  'Correlación entre Ángulo de Tono (Hue) e Índice de Color por Muestra':  'Correlation between Hue Angle and Color Index by Sample',
  'Croma vs. Índice de Color: Hierbabuena, Eucalipto y Naranjo':  'Chroma vs. Color Index: Spearmint, Eucalyptus and Orange',

  // ── Individual analysis modal ──
  'Cargando…':                       'Loading…',
  'Error al cargar datos individuales': 'Error loading individual data',
  'Eliminar':                        'Delete',
  '¿Estas seguro de eliminar':       'Are you sure you want to delete',
  'muestra(s) seleccionada(s)?':     'selected sample(s)?',

  // ── Lote wizard ──
  '⚠ No puedes asignar la misma imagen a dos archivos CSV distintos':  '⚠ You cannot assign the same image to two different CSV files',
  'Hay más archivos CSV que imágenes':  'There are more CSV files than images',
  'Hay más imágenes que archivos CSV':  'There are more images than CSV files',
  'cada CSV debe tener una imagen asociada':  'each CSV must have an associated image',
  'debe haber la misma cantidad':    'there must be the same quantity',
  'Nombre Muestra con formato fruta1.1.1': 'Sample name in format fruit1.1.1',

  // ── Eliminar modal ──
  'Seleccionar muestras de piña a eliminar':  'Select pineapple samples to delete',
  'Seleccionar muestras de aromáticas a eliminar':  'Select aromatic samples to delete',
  ' muestra(s) seleccionada(s)':    ' selected sample(s)',
  'Selecciona al menos una muestra para eliminar':  'Select at least one sample to delete',

  // ── Misc wizard strings ──
  'El nombre es obligatorio':        'Name is required',
  'El NIT es obligatorio':           'Tax ID is required',
  'Error: ':                         'Error: ',
  ' muestra(s) de ':                 ' sample(s) of ',
  ' (frutas)':                       ' (fruits)',
  ' (aromáticas)':                   ' (aromatics)',
  ' muestra(s) sin proveedor asignado':  ' sample(s) without assigned supplier',
  'Entendido':                       'Understood',

  // ── DB estado names (case-insensitive fallback too) ──
  'No madura':                       'Not Ripe',
  'Inicio de maduración':            'Start of Ripening',
  'Maduración temprana':             'Early Ripening',
  'Maduración media':                'Medium Ripening',
  'Casi madura':                     'Almost Ripe',
  'Baja Pigmentación':               'Low Pigmentation',
  'Pigmentación baja':               'Low Pigmentation',
  'Inicio de pigmentación':          'Start of Pigmentation',
  'Pigmentación temprana':           'Early Pigmentation',
  'Pigmentación media':              'Medium Pigmentation',
  'Casi pigmentada':                 'Almost Pigmented',

  // ── Custom frutas estado names (from user DB) ──
  'Senescencia':                     'Senescence',
  'Madurez óptima (cosecha)':        'Optimal Ripeness (Harvest)',
  'Desarrollo vegetativo':           'Vegetative Development',
  'Juvenil (Inmaduro)':              'Juvenile (Immature)',

  // ── Plant / fruit type names (config) ──
  'Piña':                            'Pineapple',
  'Naranjo':                         'Orange Tree',
  'Hierbabuena':                     'Spearmint',
  'Eucalipto':                       'Eucalyptus',
  'Aguacate':                        'Avocado',
  'Fresa':                           'Strawberry',
  'Albahaca':                        'Basil',
  'Manzanilla':                      'Chamomile',
  'Romero':                          'Rosemary',

  // ── Config tabs ──
  'Proveedores':                     'Suppliers',
  'Configuración del Sistema':       'System Settings',

  ' muestra(s) de ':               ' sample(s) of ',
  ' muestra(s) de fruta (frutas)': ' sample(s) of fruit (fruits)',
  ' muestra(s) de aromáticas (aromáticas)': ' sample(s) of aromatics (aromatics)',
  ' muestra(s) de aromáticas':     ' sample(s) of aromatics',
  ' (frutas)':                     ' (fruits)',
  ' (aromáticas)':                 ' (aromatics)',
  ' muestra(s) sin proveedor asignado': ' sample(s) without assigned provider',
  ' y ':                           ' and ',
  'Editar':                        'Edit',
  'No hay frutas':                 'No fruits',
  'No hay plantas':                'No plants',
  'Ninguna imagen seleccionada':   'No image selected',
  'Cargando tipos…':               'Loading types…',
  'Error al importar datos.':      'Error importing data.',
  'Error al cargar muestras':      'Error loading samples',
  'Configuración inicial':         'Initial Setup',

  'Seleccionar CSV':                 'Select CSV',
  'Seleccionar imágenes':            'Select Images',
  'Cargar CSV':                      'Load CSV',
  'Guardar Muestras':                '💾 Save Samples',

  // ── Not found / fallback ──
  'No hay datos':                    'No data',
  'Dashboard - Frutas y Plantas Aromáticas': 'Dashboard - Fruits and Aromatic Plants',
  'Buscar muestra…':                 'Search sample…',
};

function t(es) {
  if (idiomaActual === 'es') return es;
  if (TRANS[es] !== undefined) return TRANS[es];
  _buildCI();
  const ci = _TRANS_CI[es.toLowerCase()];
  return ci !== undefined ? TRANS[ci] : es;
}

function traducirDOM() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const traducido = t(key);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      if (el.type === 'button' || el.type === 'submit') { el.value = traducido; }
    } else if (el.tagName === 'OPTION') {
      el.textContent = traducido;
    } else if (el.children.length === 0) {
      el.textContent = traducido;
    }
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });
}

function actualizarSelectorIdioma() {
  const esActivo = idiomaActual === 'es';
  const flag = esActivo ? '🇪🇸' : '🇬🇧';
  [document.getElementById('selector-idioma-flag'), document.getElementById('selector-idioma-flag-aro')].forEach(el => {
    if (el) el.textContent = flag;
  });
  const dropdowns = ['dropdown-idioma', 'dropdown-idioma-aro'];
  dropdowns.forEach(id => {
    const ul = document.getElementById(id);
    if (!ul) return;
    ul.innerHTML = `<li data-lang="${esActivo ? 'en' : 'es'}">${esActivo ? '🇬🇧' : '🇪🇸'}</li>`;
  });
}

async function cambiarIdioma(lang) {
  if (lang === idiomaActual) return;
  idiomaActual = lang;
  localStorage.setItem('colorimetria_idioma', lang);
  actualizarSelectorIdioma();
  traducirDOM();
  // Update fruit selector button text & dropdown
  const frutaNombre = document.getElementById('selector-fruta-nombre');
  if (frutaNombre && typeof _frutaDashboardActiva !== 'undefined' && _frutaDashboardActiva) {
    frutaNombre.textContent = t(_frutaDashboardActiva.nombre);
    const frutaIcono = document.getElementById('selector-fruta-icono');
    if (frutaIcono) frutaIcono.textContent = (_frutaDashboardActiva.icono && _frutaDashboardActiva.icono !== '??' ? _frutaDashboardActiva.icono : '🍍');
  }
  if (typeof cargarSelectorFrutas === 'function') await cargarSelectorFrutas();
  // Update aromatic selector button text & dropdown
  const aroNombre = document.getElementById('selector-aro-nombre');
  if (aroNombre && typeof _aroDashboardActiva !== 'undefined' && _aroDashboardActiva) {
    aroNombre.textContent = t(_aroDashboardActiva.nombre);
    const aroIcono = document.getElementById('selector-aro-icono');
    if (aroIcono) aroIcono.textContent = (_aroDashboardActiva.icono && _aroDashboardActiva.icono !== '??' ? _aroDashboardActiva.icono : '🌿');
  }
  if (typeof cargarSelectorAromaticas === 'function') await cargarSelectorAromaticas();
  if (typeof cargarTodoElDashboard === 'function') {
    await cargarTodoElDashboard();
  } else if (typeof cargarSelectorProveedores === 'function') {
    await cargarSelectorProveedores(true);
  }
  // Re-render config panels so DB names re-translate via t()
  if (typeof cargarTablaProveedores === 'function') cargarTablaProveedores();
  if (typeof cargarConfigFrutas === 'function') cargarConfigFrutas();
  if (typeof cargarConfigAromaticas === 'function') cargarConfigAromaticas();
}

function idiomaInicial() {
  if (idiomaActual === 'es') return;
  actualizarSelectorIdioma();
  setTimeout(traducirDOM, 50);
}
