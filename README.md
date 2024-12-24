# Quick API Backend

This is Quick API Backend.

## Requirements

Please specify the required variables in `.env` for this project.

## Usage

### Quick Start

```bash
docker-compose build && docker-compose up
```

### Rebuild

Clean up and rebuild.

```bash
rm -rf backend-db-data &&  docker-compose down -v && docker-compose build && docker-compose up
```

## Misc

- Create superuser

```bash
bash dev-tool.sh create-superuser
```

- Enter Shell

```bash
bash dev-tool.sh shell
```

- Start New APP

```bash
bash dev-tool.sh django-startapp <YOUR_NEW_APP_NAME>
```

## Link

> Here's port `8787` is an example. You can define it in `.env` file.

- Admin: http://localhost:8787/api/__hidden_admin/

- Redoc: http://localhost:8787/api/__hidden_redoc

- Swagger: http://localhost:8787/api/__hidden_swagger
