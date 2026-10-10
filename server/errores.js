// Error con mensaje para la persona usuaria y código HTTP.
export class ErrorApp extends Error {
  constructor(codigo, mensaje, estado = 500) {
    super(mensaje)
    this.codigo = codigo
    this.estado = estado
  }
}
