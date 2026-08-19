# Taller de árboles de commits

## Qué vas a construir

Una **página web real, con contenido real** — el tema lo eliges tú (un portafolio, la página de un producto inventado, una guía sobre algo que te interese, lo que quieras). Puede ser tan simple como quieras en diseño, pero **no puede ser un "Hola Mundo" ni una plantilla vacía**: debe tener secciones, texto e interacción que de verdad correspondan a una idea concreta.

Ese contenido (HTML, CSS, JS) es completamente tuyo — nadie te va a decir qué código escribir. Lo que sí vamos a evaluar con lupa es **cómo usas git** mientras lo construyes.

Este taller lo tienes que hacer tú, a mano. No dejes que una IA te haga los commits, las ramas o los merges: el ejercicio existe para que practiques tú, no para que quede un repo bonito. Hay chequeos automáticos sobre el contenido y el patrón de trabajo.

## Qué vas a practicar

15 pasos que cubren:

- Crear ramas desde `main` y desde otras ramas (incluye dos casos de rama-sobre-rama).
- Escribir mensajes de commit que describan de verdad lo que hiciste (nada de "update" o "cambios"), y que además toquen el tipo de archivo que corresponde a esa parte del sitio.
- **2 merges obligatorios** (`git merge --no-ff`) para integrar ramas en `main`.
- Un **tag anotado** marcando una versión.
- Un **cherry-pick** entre ramas (`git cherry-pick -x`).
- Un **revert** de un commit propio (`git revert`).

## Cómo funciona

1. Ve a la pestaña **Issues** de este repositorio. Ahí vas a encontrar el paso 1/15, con instrucciones de **git** (no de código).
2. Cada vez que hagas `git push` (de una rama o de un tag), un workflow revisa tu repositorio automáticamente:
   - Si el paso se cumple, el issue se cierra solo y aparece(n) el/los siguiente(s) — varios pasos pueden desbloquearse en paralelo si comparten el mismo requisito.
   - Si algo no cumple, te va a comentar exactamente qué está mal para que lo corrijas.
3. Repite hasta completar los 15 pasos. Al final se abre y cierra un issue de felicitación.

Los pasos tienen dependencias: por ejemplo, el tag del paso 8 necesita que los dos merges (pasos 6 y 7) ya estén hechos, y el cherry-pick del paso 11 necesita las ramas de los pasos 4 y 9.

## Formato de los mensajes de commit

Todos los commits deben seguir [Conventional Commits](https://www.conventionalcommits.org/):

```
tipo(alcance opcional): descripción real de lo que hiciste
```

Reglas que se revisan automáticamente en cada paso:

- El **tipo** debe ser uno de los permitidos para ese paso (se indica en el issue).
- Debe incluir la **palabra clave** de ese paso (también indicada en el issue).
- La descripción debe tener contenido real: mínimo 20 caracteres y al menos 3 palabras que no sean relleno genérico.
- En los pasos que lo indican, el commit debe tocar un archivo del tipo esperado (`.html`, `.css` o `.js`) — no basta con cambiar el mensaje.
- Ningún commit puede repetir el mensaje de otro dentro de la misma rama.
- **No se aceptan mensajes genéricos**: `update`, `cambios`, `fix`, `wip`, `prueba`, `arreglos`, etc. van a ser rechazados.
- Los merges necesitan un mensaje propio y real (`git merge --no-ff -m "..."`), y los tags necesitan ser anotados (`git tag -a`).

## Ver tu progreso en vivo

Puedes revisar tu árbol de commits en cualquier momento, sin esperar a que corra el workflow, con esta herramienta:

**[Bitácora de Ramas](https://claude.ai/code/artifact/9bff345d-9bf7-4ca5-a74f-9c5d69f77306)** — pega ahí la salida de:

```
git log --all --topo-order --pretty=format:"%H§§F§§%P§§F§§%D§§F§§%B§§R§§"
```

y vas a ver tu árbol dibujado y comparado contra el diagrama objetivo del taller, con el mismo detalle de errores que te daría el bot en los Issues.

## Reglas rápidas

- No edites `taller/pasos.json` ni `.github/` — ahí vive la validación automática.
- Usa `--no-ff` en los dos merges obligatorios; si no, git puede hacer fast-forward y no queda un commit de merge que se pueda validar.
- Usa `-x` en el cherry-pick; sin esa bandera no queda el rastro que se valida.
- Si un commit quedó mal escrito, corrígelo con `git commit --amend` (si es el último) o `git rebase -i` (si es uno anterior) y vuelve a hacer push; no hagas un commit nuevo solo para "arreglar el mensaje".
