# Static assets

Files here are served from the site root, so `public/school-gate.jpg` is reachable
at `/school-gate.jpg`.

## school-gate.jpg

The photograph on the login page: the Hun Sen Turi school gate.

Save the photo here with exactly this name. The login page loads it by URL rather
than importing it, so nothing needs rebuilding — refresh the browser and it
appears. If the file is missing the page falls back to a plain gradient instead of
showing a broken image.

Guidance for the photo:

- Landscape, at least 1600px wide (the panel is tall on desktop, so a portrait
  photo gets cropped hard at the sides)
- Keep it under ~500KB; it is the first thing that loads before anyone signs in
- The subject should sit centre-left: the right side of the panel is covered by a
  dark gradient that carries the school name
