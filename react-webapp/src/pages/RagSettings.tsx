import React, { useState, useEffect } from "react";
import {
  Brain,
  Database,
  Settings2,
  Zap,
  Package,
  CheckCircle,
  AlertCircle,
  Wifi,
  WifiOff,
  Plus,
  Minus,
  Key,
  Calendar,
  Globe,
  Shield,
  BarChart3,
  MessageSquare,
  FileText,
  Download,
  Upload,
  Settings,
  X,
  Link,
  Copy,
  Check,
  CloudUpload,
  File,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Layout } from "../components/Layout";
import { useToken } from "../contexts/TokenContext";
import { useAuth } from "../contexts/AuthContext";
import { CredentialService } from "../services/credentialService";
import { FeatureService, Feature } from "../services/featureService";
import {
  DocumentService,
  Document,
  UploadProgress,
} from "../services/DocumentService";
import { cn } from "../utils/cn";

// Helper function to get icon for feature based on category or key
const getFeatureIcon = (feature: Feature) => {
  if (feature.key.includes("document")) return FileText;
  if (feature.key.includes("ai") || feature.key.includes("generation"))
    return Brain;
  if (feature.key.includes("search") || feature.key.includes("vector"))
    return Database;
  if (feature.key.includes("analytics")) return BarChart3;
  if (feature.key.includes("chat") || feature.key.includes("message"))
    return MessageSquare;
  if (feature.key.includes("security")) return Shield;
  if (feature.key.includes("api")) return Zap;
  if (feature.key.includes("export")) return Download;
  if (feature.key.includes("upload") || feature.key.includes("import"))
    return Upload;
  return Package; // Default icon
};

const getAvailableAddons = (t: any) => [
  {
    id: "advanced_analytics",
    name: t("addons.advancedAnalytics"),
    description: t("addons.advancedAnalyticsDesc"),
    price: "$9.99/month",
    enabled: false,
    icon: BarChart3,
    category: "Analytics",
  },
  {
    id: "multi_language",
    name: t("addons.multiLanguage"),
    description: t("addons.multiLanguageDesc"),
    price: "$14.99/month",
    enabled: true,
    icon: Globe,
    category: "Language",
  },
  {
    id: "advanced_security",
    name: t("addons.advancedSecurity"),
    description: t("addons.advancedSecurityDesc"),
    price: "$19.99/month",
    enabled: false,
    icon: Shield,
    category: "Security",
  },
  {
    id: "bulk_processing",
    name: t("addons.bulkProcessing"),
    description: t("addons.bulkProcessingDesc"),
    price: "$24.99/month",
    enabled: true,
    icon: Upload,
    category: "Processing",
  },
  {
    id: "api_access",
    name: t("addons.apiAccess"),
    description: t("addons.apiAccessDesc"),
    price: "$12.99/month",
    enabled: false,
    icon: Zap,
    category: "API",
  },
  {
    id: "export_tools",
    name: t("addons.exportTools"),
    description: t("addons.exportToolsDesc"),
    price: "$7.99/month",
    enabled: true,
    icon: Download,
    category: "Tools",
  },
];

export function RagSettings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { token, loading } = useToken();
  const [userKeys, setUserKeys] = useState<string[]>([]);
  const [credentialsLoading, setCredentialsLoading] = useState(true);
  const [dbFeatures, setDbFeatures] = useState<Feature[]>([]);
  const [featuresLoading, setFeaturesLoading] = useState(true);
  const [addons, setAddons] = useState(getAvailableAddons(t));
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showCredentialForm, setShowCredentialForm] = useState(false);
  const [credentialForm, setCredentialForm] = useState({
    accessToken: "",
    recipientId: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [webhookCopied, setWebhookCopied] = useState(false);
  const [userDocuments, setUserDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(
    null
  );
  const [dragActive, setDragActive] = useState(false);

  // Fetch features from database
  useEffect(() => {
    const fetchFeatures = async () => {
      try {
        setFeaturesLoading(true);
        const features = await FeatureService.getAllFeatures();
        setDbFeatures(features);
      } catch (error) {
        console.error("Error fetching features:", error);
        setDbFeatures([]);
      } finally {
        setFeaturesLoading(false);
      }
    };

    fetchFeatures();
  }, []);

  // Fetch user credentials
  useEffect(() => {
    const fetchCredentials = async () => {
      if (!user?.id) {
        setCredentialsLoading(false);
        return;
      }

      try {
        setCredentialsLoading(true);
        const keys = await CredentialService.getUserKeys(user.id);
        setUserKeys(keys);
      } catch (error) {
        console.error("Error fetching credentials:", error);
        setUserKeys([]);
      } finally {
        setCredentialsLoading(false);
      }
    };

    fetchCredentials();
  }, [user?.id]);

  // Fetch documents when modal opens for RAG features
  useEffect(() => {
    if (
      isModalOpen &&
      (selectedFeature?.category === "rag" ||
        selectedFeature?.key === "rag_files" ||
        selectedFeature?.name.toLowerCase().includes("rag") ||
        selectedFeature?.key.toLowerCase().includes("rag")) &&
      user?.id
    ) {
      fetchUserDocuments();
    }
  }, [isModalOpen, selectedFeature, user?.id]);

  const toggleAddon = (addonId: string) => {
    setAddons((prev) =>
      prev.map((addon) =>
        addon.id === addonId ? { ...addon, enabled: !addon.enabled } : addon
      )
    );
  };

  const openFeatureModal = (feature: Feature) => {
    setSelectedFeature(feature);
    setIsModalOpen(true);
  };

  const closeFeatureModal = () => {
    setSelectedFeature(null);
    setIsModalOpen(false);
    setShowCredentialForm(false);
    setCredentialForm({ accessToken: "", recipientId: "" });
    setSaveSuccess(false);
    setSaveError(null);
  };

  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeature || !user?.id) return;

    setIsSubmitting(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      // Check authentication status first
      const authCheck = await CredentialService.checkAuthentication();

      if (!authCheck.isAuthenticated) {
        throw new Error(authCheck.error || "Authentication required");
      }

      console.log("Creating credential for:", {
        userId: user.id,
        authenticatedUserId: authCheck.userId,
        featureKey: selectedFeature.key,
        hasAccessToken: !!credentialForm.accessToken,
        hasRecipientId: !!credentialForm.recipientId,
      });

      // Create credential using CredentialService
      const newCredential = await CredentialService.createCredential(
        user.id,
        selectedFeature.key,
        credentialForm.accessToken,
        credentialForm.recipientId
      );

      console.log("Credential created successfully:", newCredential);

      // Refresh user keys
      const keys = await CredentialService.getUserKeys(user.id);
      setUserKeys(keys);

      // Show success and close form
      setSaveSuccess(true);
      setShowCredentialForm(false);
      setCredentialForm({ accessToken: "", recipientId: "" });

      // Auto-hide success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error creating credential:", error);

      // Provide more specific error messages
      let errorMessage = "Failed to save credentials";

      if (error instanceof Error) {
        if (
          error.message.includes("Permission denied") ||
          error.message.includes("42501")
        ) {
          errorMessage =
            "Permission denied. Please refresh the page and try again.";
        } else if (error.message.includes("Authentication required")) {
          errorMessage = "Please log in again to save credentials.";
        } else {
          errorMessage = error.message;
        }
      }

      setSaveError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const copyWebhookUrl = async () => {
    const webhookUrl =
      "https://n8n.srv1059220.hstgr.cloud/webhook/8431d22a-bd0d-435d-b9c2-bc6f0ca2681e";
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setWebhookCopied(true);
      setTimeout(() => setWebhookCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy webhook URL:", err);
    }
  };

  const fetchUserDocuments = async () => {
    if (!user?.id) return;
    try {
      const documents = await DocumentService.getUserDocuments(user.id);
      setUserDocuments(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
    }
  };

  const handleFileUpload = async (files: FileList | File[]) => {
    if (!user?.id || !selectedFeature) return;

    const file = files[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress({
      progress: 0,
      status: "uploading",
      message: "Starting upload...",
    });

    try {
      const result = await DocumentService.uploadAndProcessFile(
        file,
        user.id,
        (progress) => setUploadProgress(progress)
      );

      if (result.success) {
        await fetchUserDocuments(); // Refresh document list
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError(result.error || "Upload failed");
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleDeleteDocument = async (documentId: number) => {
    if (!user?.id) return;

    try {
      const result = await DocumentService.deleteDocument(documentId, user.id);
      if (result.success) {
        await fetchUserDocuments(); // Refresh document list
      } else {
        setSaveError(result.error || "Delete failed");
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Delete failed");
    }
  };

  // Group and sort features by category and online/offline status
  const getGroupedFeatures = () => {
    const nonAddonFeatures = dbFeatures.filter(
      (feature) => feature.category !== "addon"
    );

    // Group by category
    const grouped = nonAddonFeatures.reduce((acc, feature) => {
      const category = feature.category || "general";
      const normalizedCategory = category.toLowerCase();

      if (!acc[normalizedCategory]) {
        acc[normalizedCategory] = [];
      }
      acc[normalizedCategory].push(feature);
      return acc;
    }, {} as Record<string, typeof dbFeatures>);

    // Sort each group by online status (online first, then offline)
    Object.keys(grouped).forEach((category) => {
      grouped[category].sort((a, b) => {
        const aOnline = userKeys.includes(a.key);
        const bOnline = userKeys.includes(b.key);

        // Online features first
        if (aOnline && !bOnline) return -1;
        if (!aOnline && bOnline) return 1;

        // Then by name alphabetically
        return a.name.localeCompare(b.name);
      });
    });

    // Define category order and display names
    const categoryOrder = ["chat", "agent", "rag", "general"];
    const categoryDisplayNames = {
      chat: "Chat Features",
      agent: "Agent Features",
      rag: "RAG Features",
      general: "General Features",
    };

    // Return ordered categories
    const orderedGroups: Array<{
      category: string;
      displayName: string;
      features: typeof dbFeatures;
      onlineCount: number;
      totalCount: number;
    }> = [];

    categoryOrder.forEach((category) => {
      if (grouped[category] && grouped[category].length > 0) {
        const features = grouped[category];
        const onlineCount = features.filter((f) =>
          userKeys.includes(f.key)
        ).length;

        orderedGroups.push({
          category,
          displayName:
            categoryDisplayNames[
              category as keyof typeof categoryDisplayNames
            ] || category,
          features,
          onlineCount,
          totalCount: features.length,
        });
      }
    });

    // Add any remaining categories not in the predefined order
    Object.keys(grouped).forEach((category) => {
      if (!categoryOrder.includes(category)) {
        const features = grouped[category];
        const onlineCount = features.filter((f) =>
          userKeys.includes(f.key)
        ).length;

        orderedGroups.push({
          category,
          displayName:
            category.charAt(0).toUpperCase() + category.slice(1) + " Features",
          features,
          onlineCount,
          totalCount: features.length,
        });
      }
    });

    return orderedGroups;
  };

  return (
    <Layout title={t("navigation.ragSettings")}>
      <div className="space-y-8">
        {/* Active Token Section */}
        <div className="glassmorphism rounded-2xl p-6 border border-gray-200/20 dark:border-gray-500/20 shadow-sm shadow-gray-200/50 dark:shadow-none">
          <div className="flex items-center gap-3 mb-6">
            <Key className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Active Token
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-300">
                Loading token information...
              </span>
            </div>
          ) : token ? (
            <div className="space-y-4">
              {/* Token Details */}
              <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-200/50 dark:border-emerald-500/20">
                <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    Token Active
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Package: {token.package}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Package and Expires Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg glassmorphism border border-gray-200/30 dark:border-gray-500/20 shadow-sm shadow-gray-100/50 dark:shadow-none">
                    <div className="flex items-center gap-2 mb-1">
                      <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Package
                      </span>
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {token.package}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg glassmorphism border border-gray-200/30 dark:border-gray-500/20 shadow-sm shadow-gray-100/50 dark:shadow-none">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Expires
                      </span>
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {token.expiredAt ? formatDate(token.expiredAt) : "Never"}
                    </div>
                  </div>
                </div>

                {/* Webhook Card - Full Width */}
                <div className="p-4 rounded-lg glassmorphism border border-gray-200/30 dark:border-gray-500/20 shadow-sm shadow-gray-100/50 dark:shadow-none">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 mb-2">
                      <Link className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Webhook URL
                      </span>
                    </div>
                    <button
                      onClick={copyWebhookUrl}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors"
                    >
                      {webhookCopied ? (
                        <>
                          <Check className="w-3 h-3" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <div className="font-mono text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 p-2 rounded border break-all">
                    https://n8n.srv1059220.hstgr.cloud/webhook/8431d22a-bd0d-435d-b9c2-bc6f0ca2681e
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-amber-600 dark:text-amber-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No Active Token
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                You need to activate a token to access RAG features
              </p>
              <button className="btn-aura px-6 py-2 text-sm font-semibold rounded-lg">
                Activate Token
              </button>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="glassmorphism rounded-2xl p-6 border border-gray-200/20 dark:border-gray-500/20 shadow-sm shadow-gray-200/50 dark:shadow-none">
          <div className="flex items-center gap-3 mb-6">
            <Settings2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Features
            </h2>
            {featuresLoading || credentialsLoading ? (
              <div className="ml-auto flex items-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Loading...
                </span>
              </div>
            ) : (
              <div className="ml-auto flex items-center gap-2 text-sm">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-gray-600 dark:text-gray-300">
                    Online (
                    {
                      dbFeatures.filter(
                        (f) =>
                          f.category !== "addon" && userKeys.includes(f.key)
                      ).length
                    }
                    )
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span className="text-gray-600 dark:text-gray-300">
                    Offline (
                    {
                      dbFeatures.filter(
                        (f) =>
                          f.category !== "addon" && !userKeys.includes(f.key)
                      ).length
                    }
                    )
                  </span>
                </div>
              </div>
            )}
          </div>

          {!featuresLoading && !credentialsLoading && (
            <div className="space-y-8">
              {getGroupedFeatures().map((group) => (
                <div key={group.category}>
                  {/* Category Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {group.displayName}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300 mt-1">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                          <span>Online ({group.onlineCount})</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                          <span>
                            Offline ({group.totalCount - group.onlineCount})
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Feature Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.features.map((feature) => {
                      const isOnline = userKeys.includes(feature.key);
                      return (
                        <div
                          key={feature.id}
                          onClick={() => openFeatureModal(feature)}
                          className="p-4 rounded-xl glassmorphism border border-gray-200/30 dark:border-gray-500/20 hover:shadow-md shadow-sm shadow-gray-100/50 dark:shadow-none transition-all duration-200 cursor-pointer hover:scale-[1.02]"
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                "p-2 rounded-lg",
                                isOnline
                                  ? "bg-emerald-100 dark:bg-emerald-900/30"
                                  : "bg-red-100 dark:bg-red-900/30"
                              )}
                            >
                              <Package
                                className={cn(
                                  "w-5 h-5",
                                  isOnline
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-red-600 dark:text-red-400"
                                )}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                                  {feature.name}
                                </h3>
                                {isOnline ? (
                                  <Wifi className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                ) : (
                                  <WifiOff className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                                )}
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">
                                {feature.description ||
                                  "No description available"}
                              </p>
                              <div
                                className={cn(
                                  "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                                  isOnline
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                                    : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                )}
                              >
                                {isOnline ? "Online" : "Offline"}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {getGroupedFeatures().length === 0 && (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    No Features Available
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Features will appear here once they are configured.
                  </p>
                </div>
              )}
            </div>
          )}

          {featuresLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-300">
                Loading features...
              </span>
            </div>
          )}
        </div>

        {/* Available Add-ons */}
        <div className="glassmorphism rounded-2xl p-6 border border-gray-200/20 dark:border-gray-500/20 shadow-sm shadow-gray-200/50 dark:shadow-none">
          <div className="flex items-center gap-3 mb-6">
            <Zap className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Available Add-ons
            </h2>
          </div>

          <div className="text-center py-12">
            <Zap className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Coming Soon
            </h3>
            <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto">
              Add-ons will be available soon to enhance your RAG system with
              additional features and capabilities.
            </p>
          </div>
        </div>
      </div>

      {/* Feature Configuration Modal */}
      {isModalOpen && selectedFeature && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200/30 dark:border-gray-500/20 shadow-2xl">
            {/* Removed glassmorphism class */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200/30 dark:border-gray-500/20">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "p-2 rounded-lg",
                    userKeys.includes(selectedFeature.key)
                      ? "bg-emerald-100 dark:bg-emerald-900/30"
                      : "bg-red-100 dark:bg-red-900/30"
                  )}
                >
                  <Package
                    className={cn(
                      "w-6 h-6",
                      userKeys.includes(selectedFeature.key)
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    )}
                  />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {selectedFeature.name}
                  </h2>
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                        userKeys.includes(selectedFeature.key)
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                      )}
                    >
                      {userKeys.includes(selectedFeature.key) ? (
                        <>
                          <Wifi className="w-3 h-3" />
                          Online
                        </>
                      ) : (
                        <>
                          <WifiOff className="w-3 h-3" />
                          Offline
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={closeFeatureModal}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="p-6">
              {/* Show Configuration Status for all features except rag_files */}
              {selectedFeature.key !== "rag_files" && (
                <div className="p-4 rounded-xl border border-gray-200/30 dark:border-gray-500/20 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    Configuration Status
                  </h3>

                  {userKeys.includes(selectedFeature.key) ? (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/50 dark:border-emerald-500/20 mb-4">
                      <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-emerald-900 dark:text-emerald-200">
                          Feature is Active
                        </div>
                        <div className="text-sm text-emerald-800 dark:text-emerald-300 mt-1">
                          This feature is configured and ready to use. The
                          required credentials are available.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-500/20 mb-4">
                        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-medium text-amber-900 dark:text-amber-200">
                            Configuration Required
                          </div>
                          <div className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                            This feature requires platform credentials to be
                            configured. Please add the required credentials to
                            activate this feature.
                          </div>
                          {!showCredentialForm && (
                            <button
                              onClick={() => setShowCredentialForm(true)}
                              className="mt-2 text-sm bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white px-3 py-1 rounded-md font-medium transition-colors duration-200"
                            >
                              Configure Credentials
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Success Message */}
                  {saveSuccess && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/50 dark:border-emerald-500/20 mb-4">
                      <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-emerald-900 dark:text-emerald-200">
                          Credentials Saved Successfully
                        </div>
                        <div className="text-sm text-emerald-800 dark:text-emerald-300 mt-1">
                          The feature is now online and ready to use.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {saveError && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200/50 dark:border-red-500/20 mb-4">
                      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-red-900 dark:text-red-200">
                          Error Saving Credentials
                        </div>
                        <div className="text-sm text-red-800 dark:text-red-300 mt-1">
                          {saveError}
                        </div>
                      </div>
                    </div>
                  )}

                  {showCredentialForm && (
                    <form
                      onSubmit={handleCredentialSubmit}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Access Token *
                        </label>
                        <input
                          type="text"
                          required
                          value={credentialForm.accessToken}
                          onChange={(e) =>
                            setCredentialForm((prev) => ({
                              ...prev,
                              accessToken: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                          placeholder="Enter your access token"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Recipient ID *
                        </label>
                        <input
                          type="text"
                          required
                          value={credentialForm.recipientId}
                          onChange={(e) =>
                            setCredentialForm((prev) => ({
                              ...prev,
                              recipientId: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                          placeholder="Enter recipient ID"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:cursor-not-allowed"
                        >
                          {isSubmitting ? "Saving..." : "Save Credentials"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCredentialForm(false)}
                          className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* File Upload Section for RAG Features */}
              {(selectedFeature.category === "rag" ||
                selectedFeature.key === "rag_files" ||
                selectedFeature.name.toLowerCase().includes("rag") ||
                selectedFeature.key.toLowerCase().includes("rag")) && (
                <div
                  className={cn(
                    "p-4 rounded-xl border border-gray-200/30 dark:border-gray-500/20",
                    selectedFeature.key !== "rag_files" && "mt-6"
                  )}
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    Document Management
                  </h3>

                  {/* File Upload Area */}
                  <div
                    className={cn(
                      "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                      dragActive
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                    )}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    {uploading ? (
                      <div className="space-y-3">
                        <CloudUpload className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {uploadProgress?.message || "Uploading..."}
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${uploadProgress?.progress || 0}%`,
                              }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {uploadProgress?.progress || 0}%
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <CloudUpload className="w-8 h-8 text-gray-400 mx-auto" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            Drop files here or click to upload
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            Supports: TXT, MD, JSON, CSV (max 10MB)
                          </div>
                        </div>
                        <input
                          type="file"
                          accept=".txt,.md,.json,.csv"
                          onChange={(e) =>
                            e.target.files && handleFileUpload(e.target.files)
                          }
                          className="hidden"
                          id="file-upload"
                          disabled={uploading}
                        />
                        <label
                          htmlFor="file-upload"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer font-medium transition-colors"
                        >
                          <Upload className="w-4 h-4" />
                          Choose Files
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Document List */}
                  {userDocuments.length > 0 && (
                    <div className="mt-6">
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Uploaded Documents ({userDocuments.length})
                      </h5>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {userDocuments.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded border"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <File className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                  {doc.metadata?.originalName || "Untitled"}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {doc.metadata?.fileSize
                                    ? `${Math.round(
                                        doc.metadata.fileSize / 1024
                                      )} KB`
                                    : ""}
                                  {doc.metadata?.uploadedAt &&
                                    ` • ${new Date(
                                      doc.metadata.uploadedAt
                                    ).toLocaleDateString()}`}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end p-6 border-t border-gray-200/30 dark:border-gray-500/20">
              <button
                onClick={closeFeatureModal}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
