# Taller de árboles de commits

## Qué vas a construir

Una **página web real, con contenido real** — el tema lo eliges tú (un portafolio, la página de un producto inventado, una guía sobre algo que te interese, lo que quieras). Puede ser tan simple como quieras en diseño, pero **no puede ser un "Hola Mundo" ni una plantilla vacía**: debe tener secciones, texto e interacción que de verdad correspondan a una idea concreta.

Ese contenido (HTML, CSS, JS) es completamente tuyo — nadie te va a decir qué código escribir. Lo que sí vamos a evaluar con lupa es **cómo usas git** mientras lo construyes.

## Qué vas a practicar

- Crear ramas desde `main` y desde otras ramas.
- Escribir mensajes de commit que describan de verdad lo que hiciste (nada de "update" o "cambios").
- Terminar el taller con un árbol de commits con varias ramas **divergentes** — por diseño, aquí **no se hacen Pull Requests ni merges**. El objetivo es que el árbol quede bien definido y sea fácil de leer.

## Cómo funciona

1. Ve a la pestaña **Issues** de este repositorio. Ahí vas a encontrar el primer paso con instrucciones de **git** (no de código).
2. Cada vez que hagas `git push`, un workflow revisa tus commits automáticamente:
   - Si cumplen el formato y el contenido esperado, el issue del paso se cierra solo y aparece el siguiente.
   - Si algo no cumple, te va a comentar exactamente qué está mal para que lo corrijas.
3. Repite hasta completar los 5 pasos. Al final se abre y cierra un issue de felicitación.

## Formato de los mensajes de commit

Todos los commits deben seguir [Conventional Commits](https://www.conventionalcommits.org/):

```
tipo(alcance opcional): descripción real de lo que hiciste
```

Reglas que se revisan automáticamente en cada paso:

- El **tipo** debe ser uno de los permitidos para ese paso (se indica en el issue).
- Debe incluir la **palabra clave** de ese paso (también indicada en el issue).
- La descripción debe tener contenido real: mínimo 20 caracteres y al menos 3 palabras que no sean relleno genérico.
- Ningún commit puede repetir el mensaje de otro dentro de la misma rama.
- **No se aceptan mensajes genéricos**: `update`, `cambios`, `fix`, `wip`, `prueba`, `arreglos`, etc. van a ser rechazados.

## Ver tu progreso en vivo

Puedes revisar tu árbol de commits en cualquier momento, sin esperar a que corra el workflow, con esta herramienta:

**[Bitácora de Ramas](https://claude.ai/code/artifact/9bff345d-9bf7-4ca5-a74f-9c5d69f77306)** — pega ahí la salida de:

```
git log --all --topo-order --pretty=format:"%H|%P|%D|%s"
```

y vas a ver tu árbol dibujado y comparado contra el diagrama objetivo del taller, con el mismo detalle de errores que te daría el bot en los Issues.

## Reglas rápidas

- No hagas `git merge` ni Pull Requests en este taller.
- No edites `taller/pasos.json` ni `.github/` — ahí vive la validación automática.
- Si un commit quedó mal escrito, corrígelo con `git commit --amend` (si es el último) o `git rebase -i` (si es uno anterior) y vuelve a hacer push; no hagas un commit nuevo solo para "arreglar el mensaje".
