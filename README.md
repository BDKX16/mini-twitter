# Instalación del Ambiente Local

## 1. **Clonar el repositorio**

    ```bash
    git clone https://github.com/BDKX16/client-dashboard.git
    cd challenge-uala
    ```

## 2. Instalación con Docker

1. **Instalar Docker**  
   Descargá e instalá [Docker Desktop](https://www.docker.com/products/docker-desktop/) según tu sistema operativo.

2. **Creamos el archivo .env e ingresamos las variables de entorno**

   Hay un archivo .env.example en cada carpeta donde podemos usar de referencia. Uno en el root, otro en la carpeta /api y otro en /fe

   Lo escencial es que en el de root y api tengamos las mismas variables para la conexión de mongo y redis.

   Y en frontend y api debemos tener bien las url de cada uno de ellos respectivamente asi nos acepta las politicas de cors imagenes y demas.

   Asi deberia quedar:

   ```plaintext
   challenge-uala/
   ├── .env           # Archivo de variables de entorno en el root
   ├── api/
   │   └── .env       # Archivo de variables de entorno para la API
   └── fe/
       └── .env       # Archivo de variables de entorno para el Frontend
   ```

3. **Construir y levantar los contenedores**
   ```bash
   docker-compose up -f docker-compose-desarrollo.yml -d --build
   ```
   Esto inicia el ambiente en modo local/desarrollo iniciando las dos bases de datos, redis y mongodb.

## 3. Instalación de servicios (npm install en API y FE)

1. **Instalar dependencias de la API**

   ```bash
   cd api
   npm install
   ```

2. **Generar datos de prueba (si es nesesario)**

   ```bash
   npm run seed
   ```

3. **Instalar dependencias del Frontend**

   ```bash
   cd ../fe
   npm install
   ```

4. **Levantar los servidores localmente**
   - Para la API:
     ```bash
     npm start
     ```
   - Para el Frontend:
     ```bash
     npm start
     ```

# Instalación del Ambiente PRODUCTIVO

## 1. **Clonar el repositorio**

    ```bash
    git clone https://github.com/BDKX16/client-dashboard.git
    cd challenge-uala
    ```

## 2. Instalación con Docker (Producción)

1. **Instalar Docker**  
   Descargá e instalá [Docker] según tu sistema operativo.

2. **Creamos el archivo .env e ingresamos las variables de entorno**

   Hay un archivo .env.example en cada carpeta donde podemos usar de referencia. Uno en el root, otro en la carpeta /api y otro en /fe

   Lo escencial es que en el de root y api tengamos las mismas variables para la conexión de mongo y redis.

   Y en frontend y api debemos tener bien las url de cada uno de ellos respectivamente asi nos acepta las politicas de cors imagenes y demas.

   Asi deberia quedar:

   ```plaintext
   challenge-uala/
   ├── .env           # Archivo de variables de entorno en el root
   ├── api/
   │   └── .env       # Archivo de variables de entorno para la API
   └── fe/
       └── .env       # Archivo de variables de entorno para el Frontend
   ```

3. **Construir y levantar los contenedores**
   ```bash
   docker-compose up -f docker-compose.yml -d --build
   ```
   Esto inicia el ambiente en modo produccion iniciando las dos bases de datos, el backend y el frontend.

> **Nota:** Verificá que tengas instalado Node.js 22 y npm antes de ejecutar los comandos.
