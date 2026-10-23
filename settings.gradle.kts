rootProject.name = "rikkei-eduportal"

val modules = listOf(
    "common-lib",
    "services:api-gateway",
    "services:auth-service",
    "services:course-service",
    "services:enrollment-service",
    "services:ai-service",
    "services:lecturer-service"
)

modules.forEach { mod ->
    val path = mod.replace(":", "/")
    if (file(path).isDirectory) {
        include(mod)
    }
}

