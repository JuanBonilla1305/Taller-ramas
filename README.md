# Taller de árboles de commits

## Cómo empezar (antes del Paso 1)

Este repositorio es una **plantilla**: no trabajes directamente aquí, primero haz tu propia copia.

1. Arriba de esta página en GitHub, haz clic en el botón verde **"Use this template"** → **"Create a new repository"**.
2. Ponle el nombre que quieras a tu copia (pública o privada, como prefieras) y dale a **"Create repository"**. GitHub te crea un repositorio nuevo, con tu usuario, con todos estos archivos ya copiados adentro.
3. Ahora trae ese repositorio a tu computador. Entra a tu repositorio nuevo, haz clic en el botón verde **"Code"** y copia el link (algo como `https://github.com/tu-usuario/nombre-de-tu-repo.git`). Abre una terminal en la carpeta donde quieras trabajar y escribe:
   `git clone https://github.com/tu-usuario/nombre-de-tu-repo.git`
   (cambia esa URL por la que copiaste de tu propio repositorio).
4. Entra a la carpeta que se acaba de crear — **de aquí en adelante, todos los comandos de git del taller los corres dentro de esta carpeta**:
   `cd nombre-de-tu-repo`
5. Ve a la pestaña **Issues** de **tu** repositorio (no de esta plantilla) — ahí está la tarea 1/15.

## Qué vas a construir

Una **página web real, con contenido real** — el tema lo eliges tú (un portafolio, la página de un producto inventado, una guía sobre algo que te interese, lo que quieras). Puede ser tan simple como quieras en diseño, pero **no puede ser un "Hola Mundo" ni una plantilla vacía**: debe tener secciones, texto e interacción que de verdad correspondan a una idea concreta.

Ese contenido (HTML, CSS, JS) es completamente tuyo — nadie te va a decir qué código escribir. Lo que sí vamos a evaluar con lupa es **cómo usas git** mientras lo construyes.

Este taller lo tienes que hacer tú, a mano. No dejes que una IA te haga los commits, las ramas o los merges: el ejercicio existe para que practiques tú, no para que quede un repo bonito. Hay chequeos automáticos sobre el contenido y el patrón de trabajo.

## Qué vas a practicar

15 tareas repartidas en **8 ramas** (`main` + 7 ramas `feature/*`):

- Crear ramas desde `main`.
- En algunas ramas (`feature/estructura`, `feature/estilos`, `feature/interactividad`, `feature/contacto-precios`), volver más adelante a la misma rama para agregar una tanda nueva de commits, con su propia palabra clave — no cada tarea necesita una rama distinta.
- Escribir mensajes de commit que describan de verdad lo que hiciste (nada de "update" o "cambios"), y que además toquen el tipo de archivo que corresponde a esa parte del sitio.
- **2 merges obligatorios** (`git merge --no-ff`) para integrar ramas en `main`.

`feature/interactividad`, `feature/footer`, `feature/galeria`, `feature/testimonios` y `feature/contacto-precios` se quedan **sin mergear** a propósito — como ramas reales que siguen en revisión.

## Cómo funciona

1. Ve a la pestaña **Issues** de este repositorio. Ahí vas a encontrar la tarea 1/15, con instrucciones de **git** (no de código).
2. Cada vez que hagas `git push`, un workflow revisa tu repositorio automáticamente:
   - Si la tarea se cumple, el issue se cierra solo y aparece(n) la(s) siguiente(s) — varias tareas pueden desbloquearse en paralelo si comparten el mismo requisito.
   - Si algo no cumple, te va a comentar exactamente qué está mal para que lo corrijas.
3. Repite hasta completar las 15 tareas. Al final se abre y cierra un issue de felicitación.

Las tareas tienen dependencias: por ejemplo, el merge de la tarea 6 necesita que la tarea 5 (segunda tanda de commits en `feature/estructura`) ya esté hecha, y esa a su vez necesita la tarea 2 (creación de la rama).

## Formato de los mensajes de commit

Todos los commits deben seguir [Conventional Commits](https://www.conventionalcommits.org/):

```
tipo(alcance opcional): descripción real de lo que hiciste
```

Reglas que se revisan automáticamente en cada tarea:

- El **tipo** debe ser uno de los permitidos para esa tarea (se indica en el issue).
- Debe incluir la **palabra clave** de esa tarea (también indicada en el issue) — es lo que distingue una tanda de commits de otra dentro de la misma rama.
- La descripción debe tener contenido real: mínimo 20 caracteres y al menos 3 palabras que no sean relleno genérico.
- En las tareas que lo indican, el commit debe tocar un archivo del tipo esperado (`.html`, `.css` o `.js`) — no basta con cambiar el mensaje.
- Ningún commit puede repetir el mensaje de otro dentro de la misma tanda.
- **No se aceptan mensajes genéricos**: `update`, `cambios`, `fix`, `wip`, `prueba`, `arreglos`, etc. van a ser rechazados.
- Los merges necesitan un mensaje propio y real (`git merge --no-ff -m "..."`).

## Ver tu progreso en vivo

Puedes revisar tu árbol de commits en cualquier momento, sin esperar a que corra el workflow, con esta herramienta:

**[Bitácora de Ramas](https://juanbonilla1305.github.io/Taller-ramas/)** — corre el comando que te muestra la página (mejor si lo mandas directo al portapapeles con `Set-Clipboard`/`pbcopy`/`xclip`, en vez de copiarlo a mano de la terminal) y pégalo ahí.

Vas a ver tu árbol dibujado y comparado contra el diagrama objetivo del taller, con el mismo detalle de errores que te daría el bot en los Issues.

## Reglas rápidas

- No edites `taller/pasos.json` ni `.github/` — ahí vive la validación automática.
- Usa `--no-ff` en los dos merges obligatorios; si no, git puede hacer fast-forward y no queda un commit de merge que se pueda validar.
- Si un commit quedó mal escrito, corrígelo con `git commit --amend` (si es el último) o `git rebase -i` (si es uno anterior) y vuelve a hacer push; no hagas un commit nuevo solo para "arreglar el mensaje".
