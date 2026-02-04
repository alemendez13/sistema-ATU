/* app/planeacion/page.tsx */
import { redirect } from 'next/navigation';

export default function PlaneacionPage() {
  // CORRECCIÓN: Apuntamos a la única página que existe actualmente
  redirect('/planeacion/tablero-okr');
}