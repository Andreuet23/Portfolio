import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';
import { ProfileLayout } from './app/layout/profile-layout';
import { provideZonelessChangeDetection } from '@angular/core';

bootstrapApplication(ProfileLayout, {
  providers: [provideRouter(routes), provideZonelessChangeDetection()]
}).catch((err) => console.error(err));

/**
 * TODO: Quitar "Leer más de los posts"
 * TODO: Terminar las páginas y de cuadrar los estilos.
*/