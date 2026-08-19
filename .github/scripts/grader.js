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

function commitsUniqueTo(rama, ramaBase) {
  const range = ramaBase ? `origin/${ramaBase}..origin/${rama}` : `origin/${rama}`;
  let raw;
  try {
    raw = execSync(
      `git log ${range} --date-order --pretty=format:"%H${SEP1}%s${SEP2}"`,
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
    );
  } catch {
    return [];
  }
  return raw
    .split(SEP2)
    .map((rec) => rec.trim())
    .filter(Boolean)
    .map((rec) => {
      const [hash, subject] = rec.split(SEP1);
      return { hash, subject: (subject || '').trim() };
    });
}

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

function commitsRaiz(rama) {
  try {
    const out = execSync(`git rev-list --max-parents=0 origin/${rama}`, { encoding: 'utf8' });
    return out.split('\n').map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function evaluarPaso(paso) {
  if (!branchExists(paso.rama)) {
    return { existe: false, completo: false, commits: [] };
  }
  if (paso.ramaBase && !branchExists(paso.ramaBase)) {
    return { existe: true, completo: false, commits: [] };
  }

  let crudos = commitsUniqueTo(paso.rama, paso.ramaBase);
  if (!paso.ramaBase) {
    // La rama sin base (main) incluye el commit semilla que GitHub Classroom
    // genera automáticamente al crear el repo desde la plantilla: no es del
    // estudiante, así que no debe contar ni marcarse como inválido.
    const raices = new Set(commitsRaiz(paso.rama));
    crudos = crudos.filter((c) => !raices.has(c.hash));
  }
  const vistos = new Map();
  const commits = crudos.map((c) => {
    const { valid, errores } = validarMensaje(c.subject, paso);
    const clave = c.subject.trim().toLowerCase();
    let finalValid = valid;
    const finalErrores = [...errores];
    if (vistos.has(clave)) {
      finalValid = false;
      finalErrores.push('Mensaje idéntico al de otro commit de esta misma rama.');
    } else {
      vistos.set(clave, true);
    }
    return { ...c, valid: finalValid, errores: finalErrores };
  });

  const completo = commits.length >= paso.commitsMinimos && commits.every((c) => c.valid);
  return { existe: true, completo, commits };
}

module.exports = async ({ github, context, core }) => {
  const { owner, repo } = context.repo;
  const { pasos } = JSON.parse(fs.readFileSync('taller/pasos.json', 'utf8'));

  const pushedBranch = context.eventName === 'push' ? context.ref.replace('refs/heads/', '') : null;

  const estado = {};

  for (const paso of pasos) {
    const ev = evaluarPaso(paso);
    estado[paso.id] = ev;

    const labelPaso = `paso:${paso.id}`;
    const { data: issuesConLabel } = await github.rest.issues.listForRepo({
      owner, repo, labels: labelPaso, state: 'all', per_page: 10,
    });
    const issue = issuesConLabel.find((i) => !i.pull_request);
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
          body: `✅ **Paso completado.** Los ${ev.commits.length} commits de \`${paso.rama}\` cumplen el formato y el contenido esperado. ¡Buen trabajo!`,
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
      } else if (issue && issue.state === 'open' && pushedBranch === paso.rama && ev.commits.length > 0) {
        const invalidos = ev.commits.filter((c) => !c.valid);
        if (invalidos.length > 0) {
          const detalle = invalidos
            .map((c) => `- \`${c.hash.slice(0, 7)}\` "${c.subject}"\n  - ${c.errores.join('\n  - ')}`)
            .join('\n');
          await github.rest.issues.createComment({
            owner, repo, issue_number: issue.number,
            body: `⚠️ Encontré commits que todavía no cumplen las reglas de este paso:\n\n${detalle}\n\nCorrígelos (por ejemplo con \`git commit --amend\` para el último, o \`git rebase -i\` para uno anterior) y vuelve a hacer push.`,
          });
        } else if (ev.commits.length < paso.commitsMinimos) {
          await github.rest.issues.createComment({
            owner, repo, issue_number: issue.number,
            body: `👀 Vas bien: ${ev.commits.length}/${paso.commitsMinimos} commits válidos en \`${paso.rama}\`. Sigue así.`,
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
        body: 'Completaste los 5 pasos con commits reales y sin merges. Tu árbol de commits debería tener 4 ramas divergentes desde `main` (una de ellas nacida de otra rama, no de `main`). Comparte el link de tu repositorio con tu profesor.',
        labels: [finalLabel],
      });
      await github.rest.issues.update({ owner, repo, issue_number: created.data.number, state: 'closed' });
    }
  }

  if (core.summary) {
    core.summary
      .addHeading('Estado del taller')
      .addTable([
        [{ data: 'Paso', header: true }, { data: 'Completo', header: true }, { data: 'Commits válidos', header: true }],
        ...pasos.map((p) => [
          p.id,
          estado[p.id].completo ? '✅' : '⏳',
          `${estado[p.id].commits.filter((c) => c.valid).length}/${estado[p.id].commits.length}`,
        ]),
      ])
      .write();
  }
};
