pipeline {
  agent any
  options { skipDefaultCheckout(true) }

  parameters {
    string(name: 'PROJECT_NAME', defaultValue: 'Meine Super App', description: 'Name des Zielprojekts')
    string(name: 'OUTPUT_DIR', defaultValue: '', description: 'Optionales Zielverzeichnis. Leer = WORKSPACE')
    string(name: 'GIT_CREDENTIALS_ID', defaultValue: '', description: 'Optional: Jenkins Credentials ID fuer GitHub Checkout (PAT/Token)')
    booleanParam(name: 'CREATE_BACKEND', defaultValue: true, description: 'Backend generieren')
    booleanParam(name: 'CREATE_FRONTEND', defaultValue: true, description: 'Frontend generieren')
    booleanParam(name: 'CREATE_MOBILE', defaultValue: true, description: 'Mobile generieren')
    booleanParam(name: 'CREATE_MARKETING', defaultValue: true, description: 'Marketing-Seiten generieren')
    booleanParam(name: 'CREATE_ASSETS', defaultValue: true, description: 'Assets-Struktur generieren')
    booleanParam(name: 'USE_POSTGRES', defaultValue: true, description: 'Docker/Postgres-Konfiguration generieren')
    booleanParam(name: 'INIT_GIT', defaultValue: true, description: 'git init ausfuehren')
    booleanParam(name: 'DRY_RUN', defaultValue: false, description: 'Nur Simulation')
  }

  environment {
    GENERATOR = 'scripts/generate_project.py'
    GENERATOR_OUTPUT_DIR = ''
  }

  stages {
    stage('Checkout Repository') {
      steps {
        script {
          def repoUrl = 'https://github.com/aerkilic/Django_Generator.git'
          def branch = 'main'
          if (params.GIT_CREDENTIALS_ID?.trim()) {
            git branch: branch, url: repoUrl, credentialsId: params.GIT_CREDENTIALS_ID.trim()
          } else {
            git branch: branch, url: repoUrl
          }
        }
      }
    }

    stage('Validate Parameters') {
      steps {
        script {
          if (!params.PROJECT_NAME?.trim()) {
            error('PROJECT_NAME darf nicht leer sein.')
          }
          env.GENERATOR_OUTPUT_DIR = params.OUTPUT_DIR?.trim() ? params.OUTPUT_DIR.trim() : env.WORKSPACE
        }
      }
    }

    stage('Prepare Workspace') {
      steps {
        sh 'python3 --version'
        sh '''
          if [ ! -f "${GENERATOR}" ]; then
            echo "[ERROR] ${GENERATOR} not found in workspace: ${WORKSPACE}"
            echo "[HINT] Ensure the repository is checked out and contains scripts/generate_project.py"
            ls -la
            exit 1
          fi
        '''
        sh 'chmod +x ${GENERATOR}'
      }
    }

    stage('Generate Project Structure') {
      steps {
        sh '''
          python3 ${GENERATOR} --task structure --project-name "${PROJECT_NAME}" --output-dir "${GENERATOR_OUTPUT_DIR}" --backend false --frontend false --mobile false --marketing false --assets false --postgres false --init-git false --dry-run ${DRY_RUN}
        '''
      }
    }

    stage('Generate Backend') {
      steps {
        script {
          if (params.CREATE_BACKEND) {
            sh '''
              python3 ${GENERATOR} --task backend --project-name "${PROJECT_NAME}" --output-dir "${GENERATOR_OUTPUT_DIR}" --backend true --frontend false --mobile false --marketing false --assets false --postgres false --init-git false --dry-run ${DRY_RUN}
            '''
          }
        }
      }
    }

    stage('Generate Frontend') {
      steps {
        script {
          if (params.CREATE_FRONTEND) {
            sh '''
              python3 ${GENERATOR} --task frontend --project-name "${PROJECT_NAME}" --output-dir "${GENERATOR_OUTPUT_DIR}" --backend false --frontend true --mobile false --marketing false --assets false --postgres false --init-git false --dry-run ${DRY_RUN}
            '''
          }
        }
      }
    }

    stage('Generate Mobile') {
      steps {
        script {
          if (params.CREATE_MOBILE) {
            sh '''
              python3 ${GENERATOR} --task mobile --project-name "${PROJECT_NAME}" --output-dir "${GENERATOR_OUTPUT_DIR}" --backend false --frontend false --mobile true --marketing false --assets false --postgres false --init-git false --dry-run ${DRY_RUN}
            '''
          }
        }
      }
    }

    stage('Generate Marketing Pages') {
      steps {
        script {
          if (params.CREATE_MARKETING) {
            sh '''
              python3 ${GENERATOR} --task marketing --project-name "${PROJECT_NAME}" --output-dir "${GENERATOR_OUTPUT_DIR}" --backend false --frontend false --mobile false --marketing true --assets false --postgres false --init-git false --dry-run ${DRY_RUN}
            '''
          }
        }
      }
    }

    stage('Generate Assets Structure') {
      steps {
        script {
          if (params.CREATE_ASSETS) {
            sh '''
              python3 ${GENERATOR} --task assets --project-name "${PROJECT_NAME}" --output-dir "${GENERATOR_OUTPUT_DIR}" --backend false --frontend false --mobile false --marketing false --assets true --postgres false --init-git false --dry-run ${DRY_RUN}
            '''
          }
        }
      }
    }

    stage('Generate Env Files') {
      steps {
        sh '''
          python3 ${GENERATOR} --task env --project-name "${PROJECT_NAME}" --output-dir "${GENERATOR_OUTPUT_DIR}" --backend false --frontend false --mobile false --marketing false --assets false --postgres false --init-git false --dry-run ${DRY_RUN}
        '''
      }
    }

    stage('Generate Docker/Postgres Config') {
      steps {
        script {
          if (params.USE_POSTGRES) {
            sh '''
              python3 ${GENERATOR} --task docker --project-name "${PROJECT_NAME}" --output-dir "${GENERATOR_OUTPUT_DIR}" --backend false --frontend false --mobile false --marketing false --assets false --postgres true --init-git false --dry-run ${DRY_RUN}
            '''
          }
        }
      }
    }

    stage('Generate Git Files') {
      steps {
        sh '''
          python3 ${GENERATOR} --task git --project-name "${PROJECT_NAME}" --output-dir "${GENERATOR_OUTPUT_DIR}" --backend false --frontend false --mobile false --marketing false --assets false --postgres false --init-git ${INIT_GIT} --dry-run ${DRY_RUN}
        '''
      }
    }

    stage('Generate Install/Start Scripts') {
      steps {
        sh '''
          python3 ${GENERATOR} --task scripts --project-name "${PROJECT_NAME}" --output-dir "${GENERATOR_OUTPUT_DIR}" --backend false --frontend false --mobile false --marketing false --assets false --postgres false --init-git false --dry-run ${DRY_RUN}
        '''
      }
    }

    stage('Generate VS Code Debug Config') {
      steps {
        sh '''
          python3 ${GENERATOR} --task vscode --project-name "${PROJECT_NAME}" --output-dir "${GENERATOR_OUTPUT_DIR}" --backend false --frontend false --mobile false --marketing false --assets false --postgres false --init-git false --dry-run ${DRY_RUN}
        '''
      }
    }

    stage('Run Basic Checks') {
      steps {
        sh 'python3 -m py_compile ${GENERATOR}'
        script {
          if (params.DRY_RUN) {
            echo 'DRY_RUN=true: no install/git actions executed.'
          }
        }
      }
    }

    stage('Print Summary') {
      steps {
        echo "PROJECT_NAME=${params.PROJECT_NAME}"
        echo "OUTPUT_DIR=${params.OUTPUT_DIR}"
        echo "GIT_CREDENTIALS_ID=${params.GIT_CREDENTIALS_ID}"
        echo "GENERATOR_OUTPUT_DIR=${env.GENERATOR_OUTPUT_DIR}"
        echo "CREATE_BACKEND=${params.CREATE_BACKEND}"
        echo "CREATE_FRONTEND=${params.CREATE_FRONTEND}"
        echo "CREATE_MOBILE=${params.CREATE_MOBILE}"
        echo "CREATE_MARKETING=${params.CREATE_MARKETING}"
        echo "CREATE_ASSETS=${params.CREATE_ASSETS}"
        echo "USE_POSTGRES=${params.USE_POSTGRES}"
        echo "INIT_GIT=${params.INIT_GIT}"
        echo "DRY_RUN=${params.DRY_RUN}"
      }
    }
  }
}
