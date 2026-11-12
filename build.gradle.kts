plugins {
    java
    id("org.springframework.boot") version "3.3.4" apply false
    id("io.spring.dependency-management") version "1.1.6" apply false
    id("org.sonarqube") version "5.0.0.4638"
    jacoco
}

allprojects {
    group = "com.rikkei.eduportal"
    version = "0.0.1-SNAPSHOT"

    repositories {
        mavenCentral()
        maven { url = uri("https://repo.spring.io/milestone") }
    }
}

subprojects {
    apply(plugin = "java")
    apply(plugin = "jacoco")

    jacoco {
        toolVersion = "0.8.12"
    }

    java {
        toolchain {
            languageVersion.set(JavaLanguageVersion.of(21))
        }
    }

    tasks.withType<Test> {
        useJUnitPlatform()
        finalizedBy(tasks.withType<JacocoReport>())
    }

    tasks.withType<JacocoReport> {
        reports {
            xml.required.set(true)
            csv.required.set(false)
            html.required.set(true)
        }
    }

    plugins.withId("org.springframework.boot") {
        tasks.named<Jar>("jar") {
            enabled = false
        }
    }
}

sonar {
    properties {
        property("sonar.projectKey", "rikkei-eduportal")
        property("sonar.projectName", "Rikkei EduPortal")
        property("sonar.host.url", "http://localhost:9000")
        property("sonar.coverage.jacoco.xmlReportPaths", "build/reports/jacoco/test/jacocoTestReport.xml")
        property("sonar.coverage.exclusions", "**/config/**, **/dto/**, **/*Application.*")
    }
}
