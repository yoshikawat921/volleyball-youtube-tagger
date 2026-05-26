const SHARED_SECRET = "CHANGE_ME";
const DEFAULT_FOLDER_ID = "YOUR_GOOGLE_DRIVE_FOLDER_ID";

function authorizeDriveAccess() {
  const folder = DriveApp.getFolderById(DEFAULT_FOLDER_ID);
  Logger.log(`Drive access OK: ${folder.getName()}`);
}

function doGet(event) {
  const params = event && event.parameter ? event.parameter : {};
  if (params.action === "directTest") {
    return directTest(params);
  }
  if (params.action === "saveProjectChunk") {
    return saveProjectChunk(params);
  }
  return jsonResponse({
    ok: true,
    app: "Volleyball Quick Tagger Drive Saver"
  });
}

function saveProjectChunk(params) {
  try {
    if (SHARED_SECRET && params.secret !== SHARED_SECRET) {
      return jsonResponse({ ok: false, error: "Invalid secret" });
    }

    const uploadId = String(params.uploadId || "");
    const index = Number(params.index);
    const total = Number(params.total);
    Logger.log(`Received chunk ${index + 1}/${total} for upload ${uploadId}`);
    if (!uploadId || !Number.isInteger(index) || !Number.isInteger(total) || total < 1) {
      return jsonResponse({ ok: false, error: "Invalid chunk metadata" });
    }

    const properties = PropertiesService.getScriptProperties();
    const prefix = `driveSave_${uploadId}_`;
    properties.setProperty(`${prefix}${index}`, params.chunk || "");

    if (index !== total - 1) {
      return jsonResponse({ ok: true, received: index });
    }

    let encoded = "";
    for (let chunkIndex = 0; chunkIndex < total; chunkIndex += 1) {
      const chunk = properties.getProperty(`${prefix}${chunkIndex}`);
      if (chunk === null) {
        return jsonResponse({ ok: false, error: `Missing chunk ${chunkIndex}` });
      }
      encoded += chunk;
    }

    for (let chunkIndex = 0; chunkIndex < total; chunkIndex += 1) {
      properties.deleteProperty(`${prefix}${chunkIndex}`);
    }

    const payloadText = Utilities.newBlob(Utilities.base64DecodeWebSafe(encoded)).getDataAsString("UTF-8");
    const payload = JSON.parse(payloadText);
    return saveProjectPayload(payload);
  } catch (error) {
    Logger.log(`saveProjectChunk error: ${String(error && error.message ? error.message : error)}`);
    return jsonResponse({
      ok: false,
      error: String(error && error.message ? error.message : error)
    });
  }
}

function doPost(event) {
  try {
    const payloadText = event.parameter && event.parameter.payload
      ? event.parameter.payload
      : event.postData.contents || "{}";
    const payload = JSON.parse(payloadText);
    return saveProjectPayload(payload);
  } catch (error) {
    Logger.log(`doPost error: ${String(error && error.message ? error.message : error)}`);
    return jsonResponse({
      ok: false,
      error: String(error && error.message ? error.message : error)
    });
  }
}

function saveProjectPayload(payload) {
  if (SHARED_SECRET && payload.secret !== SHARED_SECRET) {
    return jsonResponse({ ok: false, error: "Invalid secret" });
  }
  if (payload.action !== "saveProject") {
    return jsonResponse({ ok: false, error: "Unsupported action" });
  }
  if (!payload.folderId) {
    return jsonResponse({ ok: false, error: "Missing folderId" });
  }
  if (!payload.project) {
    return jsonResponse({ ok: false, error: "Missing project" });
  }

  const folder = DriveApp.getFolderById(payload.folderId);
  const filename = sanitizeFilename(payload.filename || buildFilename(payload.project));
  const content = JSON.stringify(payload.project, null, 2);
  const files = folder.getFilesByName(filename);
  Logger.log(`Saving project JSON: ${filename}`);
  const file = files.hasNext()
    ? updateFile(files.next(), content)
    : folder.createFile(filename, content, "application/json");

  file.setDescription(`Updated by Volleyball Quick Tagger at ${new Date().toISOString()}`);
  Logger.log(`Saved file: ${file.getName()} (${file.getId()})`);
  return jsonResponse({
    ok: true,
    fileId: file.getId(),
    filename,
    updatedAt: new Date().toISOString()
  });
}

function directTest(params) {
  return saveProjectPayload({
    action: "saveProject",
    secret: params.secret,
    folderId: params.folderId || DEFAULT_FOLDER_ID,
    filename: "Codex-Direct-Test.json",
    project: {
      projectName: "Codex-Direct-Test",
      youtubeVideoId: "XXXXXXXXXXX",
      teams: {
        A: { name: "", jerseyNumbers: [] },
        B: { name: "", jerseyNumbers: [] }
      },
      tags: []
    }
  });
}

function updateFile(file, content) {
  file.setContent(content);
  return file;
}

function buildFilename(project) {
  const title = project.projectName || project.youtubeVideoId || "volleyball-project";
  return `${title}.json`;
}

function sanitizeFilename(value) {
  const filename = String(value)
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return filename || "volleyball-project.json";
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
