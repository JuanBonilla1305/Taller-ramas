const fs = require('fs');
const { execSync } = require('child_process');

const SEP1 = '\x1f';
const SEP2 = '\x1e';

function branchExists(ref) {
  try {
    execSync(`git show-ref --verify --quiet refs/remotes/origin/${ref}`);
    return true;
  } catch {
    return false;
  }
}

function commitDeMergeQueTrae(origenTip, destino) {
  // Busca, en el historial de `destino`, el commit de merge que trajo
  // directamente `origenTip` como uno de sus padres.
  let raw;
  try {
    raw = execSync(
      `git log ${origenTip}..origin/${destino} --merges --pretty=format:"%H${SEP1}%P${SEP2}"`,
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
    );
  } catch {
    return null;
  }
  const candidatos = raw.split(SEP2).map((s) => s.trim()).filter(Boolean).map((rec) => {
    const [hash, parents] = rec.split(SEP1);
    return { hash, parents: (parents || '').trim().split(/\s+/).filter(Boolean) };
  }).filter((c) => c.parents.includes(origenTip));
  return candidatos[0] || null;
}

function commitsUniqueTo(rama, ramaBase) {
  let range;
  let yaMergeada = false;
  try {
    execSync(`git merge-base --is-ancestor origin/${rama} origin/${ramaBase}`);
    yaMergeada = true;
  } catch {
    yaMergeada = false;
  }

  if (yaMergeada) {
    // `rama` ya se fusionó en `ramaBase`. Comparar contra el tip actual de
    // ramaBase daría un rango vacío (ya la contiene, y pudo seguir avanzando
    // con otros merges despues) — se detectó probando contra el repo de
    // prueba ya mergeado: estructura-html/estilos-css perdian sus commits
    // justo al cumplir lo que el taller pide. Usamos el propio commit de
    // merge: su primer padre es el estado de ramaBase justo antes de esa
    // fusión, y eso no cambia aunque ramaBase siga avanzando despues.
    const origenTip = execSync(`git rev-parse origin/${rama}`, { encoding: 'utf8' }).trim();
    const mergeCommit = commitDeMergeQueTrae(origenTip, ramaBase);
    if (!mergeCommit || mergeCommit.parents.length < 2) return [];
    range = `${mergeCommit.parents[0]}..${origenTip}`;
  } else {
    range = `origin/${ramaBase}..origin/${rama}`;
  }

  let raw;
  try {
    raw = execSync(
      `git log ${range} --date-order --pretty=format:"%H${SEP1}%B${SEP2}"`,
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
    );
  } catch {
    return [];
  }
  return raw
    .split(SEP2)
    .map((rec) => rec.replace(/^\s+/, ''))
    .filter((rec) => rec.trim())
    .map((rec) => {
      const idx = rec.indexOf(SEP1);
      const hash = rec.slice(0, idx);
      const body = rec.slice(idx + 1).replace(/\s+$/, '');
      const subject = (body.split('\n')[0] || '').trim();
      return { hash, subject, body };
    })
    // Un commit traido con cherry-pick -x no es autoria original de esta
    // rama (pertenece al paso de cherry-pick): no debe contar ni fallar aqui.
    // Se detecto probando contra prueba: el cherry-pick obligatorio del paso
    // 11 rompia la validacion propia de feature/interactividad-js.
    .filter((c) => !c.body.toLowerCase().includes('cherry picked from commit'));
}

function archivosDe(hash) {
  if (!hash) return [];
  try {
    const out = execSync(`git diff-tree --no-commit-id --name-only -r ${hash}`, {
      encoding: 'utf8', maxBuffer: 10 * 1024 * 1024,
    });
    return out.split('\n').map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function commitsIniciales(rama) {
  // Commits hechos directamente en `rama` (primer padre) antes de su primer
  // merge. `git log origin/rama` sin acotar arrastra para siempre todo el
  // historial de cualquier cosa ya fusionada ahi (se detecto probando contra
  // el repo de prueba ya mergeado: main-setup nunca volvia a validar como
  // completo). Cortamos en el primer commit de merge que aparezca.
  let raw;
  try {
    raw = execSync(
      `git log --first-parent origin/${rama} --date-order --pretty=format:"%H${SEP1}%P${SEP1}%s${SEP2}"`,
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
    );
  } catch {
    return [];
  }
  const registros = raw.split(SEP2).map((r) => r.trim()).filter(Boolean).map((rec) => {
    const [hash, parents, subject] = rec.split(SEP1);
    return { hash, parents: (parents || '').trim().split(/\s+/).filter(Boolean), subject: (subject || '').trim() };
  });
  registros.reverse(); // de mas viejo a mas nuevo
  const resultado = [];
  for (const c of registros) {
    if (c.parents.length > 1) break; // primer merge: de aqui en adelante ya no es solo main
    resultado.push({ hash: c.hash, subject: c.subject });
  }
  return resultado;
}

function commitsRaiz(rama) {
  try {
    const out = execSync(`git rev-list --max-parents=0 origin/${rama}`, { encoding: 'utf8' });
    return out.split('\n').map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function tagInfo(nombreTag) {
  let out;
  try {
    out = execSync(
      `git for-each-ref refs/tags/${nombreTag} --format="%(objectname)${SEP1}%(contents)"`,
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
    );
  } catch {
    return null;
  }
  if (!out || !out.trim()) return null;
  const idx = out.indexOf(SEP1);
  if (idx < 0) return { objectname: out.trim(), contents: '' };
  return { objectname: out.slice(0, idx), contents: out.slice(idx + 1).replace(/\n+$/, '') };
}

// ---------- Validacion de mensajes ----------

const PALABRAS_GENERICAS = new Set([
  'update', 'updates', 'cambios', 'cambio', 'fix', 'fixes', 'wip',
  'prueba', 'pruebas', 'test', 'tests', 'testing', 'commit', 'commits',
  'misc', 'varios', 'ajustes', 'ajuste', 'correccion', 'correcciones',
  'arreglo', 'arreglos', 'trabajo', 'avance', 'avances', 'sin',
  'descripcion', 'nuevo', 'nueva', 'cosas', 'cosa', 'cambie', 'agregue',
]);

const MAPA_ACENTOS = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', ñ: 'n' };

function normalizar(texto) {
  return texto
    .toLowerCase()
    .split('')
    .map((ch) => MAPA_ACENTOS[ch] || ch)
    .join('')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
}

function validarMensaje(subject, paso) {
  const errores = [];
  const m = subject.match(/^([a-z]+)(\([a-z0-9][a-z0-9-]*\))?:\s*(.+)$/);
  if (!m) {
    errores.push('No sigue el formato "tipo(alcance opcional): descripción" (Conventional Commits).');
    return { valid: false, errores };
  }
  const tipo = m[1];
  const descripcion = m[3].trim();

  if (!paso.tiposPermitidos.includes(tipo)) {
    errores.push(`Tipo "${tipo}" no permitido en este paso. Usa uno de: ${paso.tiposPermitidos.join(', ')}.`);
  }
  if (descripcion.length < 20) {
    errores.push('La descripción es muy corta (mínimo 20 caracteres) para considerarse un cambio real.');
  }
  const keywordRe = new RegExp(`\\b${paso.palabraClave}\\b`, 'i');
  if (!keywordRe.test(subject)) {
    errores.push(`Falta la palabra clave "${paso.palabraClave}" en el mensaje.`);
  }

  const normalizado = normalizar(descripcion);
  const sinPalabraClave = normalizado.replace(new RegExp(paso.palabraClave.toLowerCase(), 'g'), '');
  const palabras = sinPalabraClave.split(/\s+/).filter(Boolean);
  const palabrasSignificativas = palabras.filter((w) => !PALABRAS_GENERICAS.has(w) && w.length > 2);
  if (palabrasSignificativas.length < 3) {
    errores.push('El mensaje parece genérico (poco contenido real más allá de palabras de relleno). Describe qué hiciste concretamente.');
  }

  return { valid: errores.length === 0, errores };
}

function esRevertCommit(subject) {
  return /^Revert "/.test(subject);
}

function validarComoRama(crudos, paso) {
  const vistos = new Map();
  return crudos.map((c) => {
    let valid;
    let errores;
    if (paso.tipo === 'revert' && esRevertCommit(c.subject)) {
      valid = true;
      errores = [];
    } else {
      const r = validarMensaje(c.subject, paso);
      valid = r.valid;
      errores = r.errores.slice();
      if (paso.patronArchivo) {
        const archivos = archivosDe(c.hash);
        const patt = new RegExp(paso.patronArchivo, 'i');
        if (!archivos.some((a) => patt.test(a))) {
          valid = false;
          errores.push(`Este commit no toca ningún archivo que coincida con ${paso.patronArchivo}: el taller espera contenido real de esa parte.`);
        }
      }
    }
    const clave = c.subject.trim().toLowerCase();
    if (vistos.has(clave)) {
      valid = false;
      errores.push('Mensaje idéntico al de otro commit de esta misma rama.');
    } else {
      vistos.set(clave, true);
    }
    return { ...c, valid, errores };
  });
}

function evaluarRama(paso) {
  if (!branchExists(paso.rama)) {
    return { existe: false, completo: false, commits: [] };
  }
  if (paso.ramaBase && !branchExists(paso.ramaBase)) {
    return { existe: true, completo: false, commits: [] };
  }

  let crudos;
  if (paso.ramaBase) {
    crudos = commitsUniqueTo(paso.rama, paso.ramaBase);
  } else {
    // La rama sin base (main) incluye el commit semilla que GitHub Classroom
    // genera automaticamente al crear el repo desde la plantilla.
    crudos = commitsIniciales(paso.rama);
    const raices = new Set(commitsRaiz(paso.rama));
    crudos = crudos.filter((c) => !raices.has(c.hash));
  }

  const commits = validarComoRama(crudos, paso);
  let completo = commits.length >= paso.commitsMinimos && commits.every((c) => c.valid);
  if (paso.tipo === 'revert') {
    const tieneRevert = commits.some((c) => esRevertCommit(c.subject));
    completo = completo && tieneRevert;
  }
  return { existe: true, completo, commits };
}

function evaluarMerge(paso) {
  if (!branchExists(paso.ramaOrigen) || !branchExists(paso.ramaDestino)) {
    return { existe: false, completo: false, commits: [] };
  }
  let esAncestro = false;
  try {
    execSync(`git merge-base --is-ancestor origin/${paso.ramaOrigen} origin/${paso.ramaDestino}`);
    esAncestro = true;
  } catch {
    esAncestro = false;
  }
  if (!esAncestro) {
    return { existe: true, completo: false, commits: [] };
  }

  const origenTip = execSync(`git rev-parse origin/${paso.ramaOrigen}`, { encoding: 'utf8' }).trim();

  let raw;
  try {
    raw = execSync(
      `git log origin/${paso.ramaOrigen}..origin/${paso.ramaDestino} --merges --pretty=format:"%H${SEP1}%P${SEP1}%s${SEP2}"`,
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
    );
  } catch {
    raw = '';
  }
  const candidatos = raw.split(SEP2).map((s) => s.trim()).filter(Boolean).map((rec) => {
    const [hash, parents, subject] = rec.split(SEP1);
    return { hash, parents: (parents || '').trim().split(/\s+/), subject: (subject || '').trim() };
  }).filter((c) => c.parents.includes(origenTip)); // solo merges que traen directamente el tip de ramaOrigen

  if (!candidatos.length) {
    return {
      existe: true,
      completo: false,
      commits: [{
        hash: '', subject: '(sin commit de merge)', valid: false,
        errores: ['No encontré un commit de merge real: parece que el merge fue fast-forward. Usa git merge --no-ff.'],
      }],
    };
  }

  const commits = candidatos.map((c) => {
    const errores = [];
    if (c.subject.length < 20) errores.push('El mensaje del merge es muy corto para describir algo real.');
    const kwRe = new RegExp(`\\b${paso.palabraClave}\\b`, 'i');
    if (!kwRe.test(c.subject)) errores.push(`Falta la palabra clave "${paso.palabraClave}" en el mensaje del merge.`);
    return { hash: c.hash, subject: c.subject, valid: errores.length === 0, errores };
  });

  const completo = commits.some((c) => c.valid);
  return { existe: true, completo, commits };
}

function evaluarTag(paso) {
  const info = tagInfo(paso.nombreTag);
  if (!info) {
    return { existe: false, completo: false, commits: [] };
  }
  const errores = [];
  const contenido = (info.contents || '').trim();
  if (contenido.length < 10) {
    errores.push('El tag necesita un mensaje real (usa git tag -a, no un tag simple).');
  }
  const kwRe = new RegExp(`\\b${paso.palabraClave}\\b`, 'i');
  if (!kwRe.test(contenido)) {
    errores.push(`Falta la palabra clave "${paso.palabraClave}" en el mensaje del tag.`);
  }
  const valid = errores.length === 0;
  return {
    existe: true,
    completo: valid,
    commits: [{ hash: info.objectname, subject: contenido || '(tag sin mensaje)', valid, errores }],
  };
}

function evaluarCherryPick(paso) {
  if (!branchExists(paso.ramaOrigen) || !branchExists(paso.ramaDestino)) {
    return { existe: false, completo: false, commits: [] };
  }
  const origenTip = execSync(`git rev-parse origin/${paso.ramaOrigen}`, { encoding: 'utf8' }).trim();
  const corto = origenTip.slice(0, 7);

  let raw;
  try {
    raw = execSync(
      `git log origin/${paso.ramaDestino} --pretty=format:"%H${SEP1}%B${SEP2}"`,
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
    );
  } catch {
    raw = '';
  }
  const commits = raw.split(SEP2).map((s) => s.trim()).filter(Boolean).map((rec) => {
    const idx = rec.indexOf(SEP1);
    return { hash: rec.slice(0, idx), body: rec.slice(idx + 1) };
  });

  const encontrado = commits.find(
    (c) => c.body.toLowerCase().includes(`cherry picked from commit ${corto}`) || c.body.includes(origenTip)
  );

  if (!encontrado) {
    return {
      existe: true,
      completo: false,
      commits: [{
        hash: '', subject: '(sin cherry-pick detectado)', valid: false,
        errores: [`Todavía no encuentro en ${paso.ramaDestino} un commit que traiga (con -x) el último commit de ${paso.ramaOrigen}.`],
      }],
    };
  }
  return {
    existe: true,
    completo: true,
    commits: [{ hash: encontrado.hash, subject: '(cherry-pick detectado correctamente)', valid: true, errores: [] }],
  };
}

function evaluarPaso(paso) {
  if (paso.tipo === 'merge') return evaluarMerge(paso);
  if (paso.tipo === 'tag') return evaluarTag(paso);
  if (paso.tipo === 'cherry-pick') return evaluarCherryPick(paso);
  return evaluarRama(paso); // 'rama' y 'revert'
}

module.exports = async ({ github, context, core }) => {
  const { owner, repo } = context.repo;
  const { pasos } = JSON.parse(fs.readFileSync('taller/pasos.json', 'utf8'));

  const estado = {};

  for (const paso of pasos) {
    const ev = evaluarPaso(paso);
    estado[paso.id] = ev;

    const labelPaso = `paso:${paso.id}`;
    const { data: issuesConLabel } = await github.rest.issues.listForRepo({
      owner, repo, labels: labelPaso, state: 'all', per_page: 10,
    });
    const candidatas = issuesConLabel.filter((i) => !i.pull_request);
    // Si un run concurrente dejó un duplicado, preferimos el que sigue abierto
    // (el que de verdad necesita seguimiento) sobre el mas reciente.
    const issue = candidatas.find((i) => i.state === 'open') || candidatas[0];
    const prerequisitosCompletos = paso.requiere.every((id) => estado[id] && estado[id].completo);

    if (ev.completo) {
      if (!issue) {
        const created = await github.rest.issues.create({
          owner, repo, title: paso.tituloIssue, body: paso.cuerpoIssue, labels: [labelPaso],
        });
        await github.rest.issues.createComment({
          owner, repo, issue_number: created.data.number,
          body: '✅ Este paso ya estaba completo cuando se generó este issue. ¡Buen trabajo!',
        });
        await github.rest.issues.update({
          owner, repo, issue_number: created.data.number, state: 'closed', labels: [labelPaso, 'completado'],
        });
      } else if (issue.state === 'open') {
        await github.rest.issues.createComment({
          owner, repo, issue_number: issue.number,
          body: '✅ **Paso completado.** Cumple el formato y el contenido esperado. ¡Buen trabajo!',
        });
        await github.rest.issues.update({
          owner, repo, issue_number: issue.number, state: 'closed', labels: [labelPaso, 'completado'],
        });
      }
    } else {
      if (!issue && prerequisitosCompletos) {
        await github.rest.issues.create({
          owner, repo, title: paso.tituloIssue, body: paso.cuerpoIssue, labels: [labelPaso],
        });
      } else if (issue && issue.state === 'open' && ev.existe) {
        const invalidos = ev.commits.filter((c) => !c.valid);
        if (invalidos.length > 0) {
          const detalle = invalidos
            .map((c) => {
              const etiquetaHash = c.hash ? `\`${c.hash.slice(0, 7)}\` ` : '';
              return `- ${etiquetaHash}"${c.subject}"\n  - ${c.errores.join('\n  - ')}`;
            })
            .join('\n');
          await github.rest.issues.createComment({
            owner, repo, issue_number: issue.number,
            body: `⚠️ Todavía no cumple las reglas de este paso:\n\n${detalle}\n\nCorrígelo y vuelve a hacer push (o \`git push --tags\` si es un tag).`,
          });
        } else if (typeof paso.commitsMinimos === 'number' && ev.commits.length < paso.commitsMinimos) {
          await github.rest.issues.createComment({
            owner, repo, issue_number: issue.number,
            body: `👀 Vas bien: ${ev.commits.length}/${paso.commitsMinimos} commits válidos. Sigue así.`,
          });
        }
      }
    }
  }

  const todosCompletos = pasos.every((p) => estado[p.id].completo);
  if (todosCompletos) {
    const finalLabel = 'completado-taller';
    const { data: finales } = await github.rest.issues.listForRepo({
      owner, repo, labels: finalLabel, state: 'all', per_page: 5,
    });
    if (!finales.find((i) => !i.pull_request)) {
      const created = await github.rest.issues.create({
        owner, repo,
        title: '🏁 ¡Taller de árboles de commits completado!',
        body: 'Completaste los 15 pasos: 10 ramas de contenido, 2 merges reales, 1 tag anotado, 1 cherry-pick y 1 revert. Comparte el link de tu repositorio con tu profesor.',
        labels: [finalLabel],
      });
      await github.rest.issues.update({ owner, repo, issue_number: created.data.number, state: 'closed' });
    }
  }

  if (core.summary) {
    core.summary
      .addHeading('Estado del taller')
      .addTable([
        [{ data: 'Paso', header: true }, { data: 'Tipo', header: true }, { data: 'Completo', header: true }],
        ...pasos.map((p) => [p.id, p.tipo, estado[p.id].completo ? '✅' : '⏳']),
      ])
      .write();
  }
};
