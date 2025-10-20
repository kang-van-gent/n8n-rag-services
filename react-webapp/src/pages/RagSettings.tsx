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
  Crown,
  ShoppingCart,
  ArrowRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useToken } from "../contexts/TokenContext";
import { useAuth } from "../contexts/AuthContext";
import { CredentialService } from "../services/credentialService";
import { FeatureService, Feature } from "../services/featureService";
import { TokenService } from "../services/tokenService";
import {
  DocumentService,
  Document,
  UploadProgress,
} from "../services/DocumentService";
import {
  TokenFeatureService,
  type TokenCompat,
} from "../services/TokenFeatureService";
import { useCart } from "../contexts/CartContext";
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const { token, loading } = useToken();
  const { addItem, items, itemCount } = useCart();
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
  const [systemMessage, setSystemMessage] = useState("");
  const [isUpdatingSystemMessage, setIsUpdatingSystemMessage] = useState(false);
  const [systemMessageSuccess, setSystemMessageSuccess] = useState(false);
  const [systemMessageError, setSystemMessageError] = useState<string | null>(
    null
  );

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
      // Load current system message from token
      if (token?.systemMessage) {
        setSystemMessage(token.systemMessage);
      } else {
        setSystemMessage(
          "You are a helpful AI assistant that provides accurate information based on the uploaded documents. Be concise and cite sources when possible."
        );
      }
    }
  }, [isModalOpen, selectedFeature, user?.id, token]);

  // Fetch user documents on component mount to check rag_files status
  useEffect(() => {
    if (user?.id) {
      fetchUserDocuments();
    }
  }, [user?.id]);

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
    setSystemMessage("");
    setSystemMessageSuccess(false);
    setSystemMessageError(null);
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

  const handleSystemMessageSave = async () => {
    if (!user?.id || !token) return;

    setIsUpdatingSystemMessage(true);
    setSystemMessageError(null);
    setSystemMessageSuccess(false);

    try {
      await TokenService.updateSystemMessage(user.id, systemMessage);
      setSystemMessageSuccess(true);

      // Auto-hide success message after 3 seconds
      setTimeout(() => setSystemMessageSuccess(false), 3000);
    } catch (error) {
      console.error("Error updating system message:", error);
      setSystemMessageError(
        error instanceof Error
          ? error.message
          : "Failed to update system message"
      );
    } finally {
      setIsUpdatingSystemMessage(false);
    }
  };

  // Get filtered features based on token
  const getIncludedFeatures = () => {
    return TokenFeatureService.filterIncludedFeatures(dbFeatures, token);
  };

  const getAvailableAddOns = (): Feature[] => {
    return TokenFeatureService.getAvailableAddOns(dbFeatures, token);
  };

  // Helper function to determine if a feature is "online"
  const isFeatureOnline = (feature: Feature): boolean => {
    // For RAG files, check if there are uploaded documents
    if (feature.key === "rag_files") {
      return userDocuments.length > 0;
    }

    // For other features, check if credentials exist
    return userKeys.includes(feature.key);
  };

  // Handle adding item to cart
  const handleAddToCart = (feature: Feature) => {
    const existingItem = items.find((item) => item.feature.key === feature.key);

    if (existingItem) {
      // Show warning that item is already in cart
      console.log(`${feature.name} is already in cart`);
      // You can add toast notification here
      return;
    }

    addItem(feature, 1);
    console.log(`Added ${feature.name} to cart`);
  }; // Group and sort features by category and online/offline status
  const getGroupedFeatures = () => {
    const includedFeatures = getIncludedFeatures();

    // Group by category
    const grouped = includedFeatures.reduce((acc, feature) => {
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
        const aOnline = isFeatureOnline(a);
        const bOnline = isFeatureOnline(b);

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
      chat: t("ragSettings.categories.chat"),
      agent: t("ragSettings.categories.agent"),
      rag: t("ragSettings.categories.rag"),
      general: t("ragSettings.categories.general"),
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
        const onlineCount = features.filter((f) => isFeatureOnline(f)).length;

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
        const onlineCount = features.filter((f) => isFeatureOnline(f)).length;

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
        <div className="bg-white/90 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/40 dark:border-gray-500/30 shadow-lg shadow-gray-200/60 dark:shadow-none">
          <div className="flex items-center gap-3 mb-6">
            <Key className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t("ragSettings.activeToken")}
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-300">
                {t("ragSettings.loadingToken")}
              </span>
            </div>
          ) : token ? (
            <div className="space-y-4">
              {/* Token Details */}
              <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-200/50 dark:border-emerald-500/20">
                <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    {t("ragSettings.tokenActive")}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {t("ragSettings.package")}: {token.package}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Package and Expires Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-white/90 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/40 dark:border-gray-500/30 shadow-lg shadow-gray-100/60 dark:shadow-none">
                    <div className="flex items-center gap-2 mb-1">
                      <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t("ragSettings.package")}
                      </span>
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {token.package}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-white/90 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/40 dark:border-gray-500/30 shadow-lg shadow-gray-100/60 dark:shadow-none">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t("ragSettings.expires")}
                      </span>
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {token.expiredAt
                        ? formatDate(token.expiredAt)
                        : t("ragSettings.never")}
                    </div>
                  </div>
                </div>

                {/* Webhook Card - Full Width */}
                <div className="p-4 rounded-lg bg-white/90 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/40 dark:border-gray-500/30 shadow-lg shadow-gray-100/60 dark:shadow-none">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 mb-2">
                      <Link className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t("ragSettings.webhookUrl")}
                      </span>
                    </div>
                    <button
                      onClick={copyWebhookUrl}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors"
                    >
                      {webhookCopied ? (
                        <>
                          <Check className="w-3 h-3" />
                          {t("ragSettings.copied")}
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          {t("ragSettings.copy")}
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
                {t("ragSettings.noActiveToken")}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {t("ragSettings.needTokenMessage")}
              </p>
              <button className="btn-aura px-6 py-2 text-sm font-semibold rounded-lg">
                {t("ragSettings.activateToken")}
              </button>
            </div>
          )}
        </div>

        {/* Features or No Token Message */}
        {!loading && !token ? (
          /* No Token State */
          <div className="bg-white/90 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/40 dark:border-gray-500/30 shadow-lg shadow-gray-200/60 dark:shadow-none">
            <div className="text-center py-12">
              <Crown className="w-16 h-16 text-amber-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                {t("ragSettings.activatePlanTitle")}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
                {t("ragSettings.activatePlanDescription")}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="p-6 rounded-xl border border-gray-200/30 dark:border-gray-500/20 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-2">
                    {t("ragSettings.plans.basic.title")}
                  </h3>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-3">
                    {t("ragSettings.plans.basic.price")}
                  </p>
                  <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                    <li>
                      • {t("ragSettings.plans.basic.features.lineChatBot")}
                    </li>
                    <li>
                      • {t("ragSettings.plans.basic.features.ragStorage")}
                    </li>
                    <li>• {t("ragSettings.plans.basic.features.support")}</li>
                  </ul>
                </div>

                <div className="p-6 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 relative">
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      {t("ragSettings.plans.popular")}
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-2">
                    {t("ragSettings.plans.standard.title")}
                  </h3>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-3">
                    {t("ragSettings.plans.standard.price")}
                  </p>
                  <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                    <li>
                      • {t("ragSettings.plans.standard.features.lineChatBots")}
                    </li>
                    <li>
                      • {t("ragSettings.plans.standard.features.messenger")}
                    </li>
                    <li>
                      • {t("ragSettings.plans.standard.features.ragStorage")}
                    </li>
                    <li>
                      • {t("ragSettings.plans.standard.features.support")}
                    </li>
                  </ul>
                </div>

                <div className="p-6 rounded-xl border border-gray-200/30 dark:border-gray-500/20 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-2">
                    {t("ragSettings.plans.enterprise.title")}
                  </h3>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-3">
                    {t("ragSettings.plans.enterprise.price")}
                  </p>
                  <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                    <li>
                      • {t("ragSettings.plans.enterprise.features.allStandard")}
                    </li>
                    <li>
                      • {t("ragSettings.plans.enterprise.features.ragStorage")}
                    </li>
                    <li>
                      • {t("ragSettings.plans.enterprise.features.calendar")}
                    </li>
                    <li>
                      • {t("ragSettings.plans.enterprise.features.googleDrive")}
                    </li>
                    <li>
                      • {t("ragSettings.plans.enterprise.features.support")}
                    </li>
                  </ul>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="btn-aura px-8 py-3 text-base font-semibold rounded-lg flex items-center gap-2">
                  <Crown className="w-5 h-5" />
                  {t("ragSettings.viewAllPlans")}
                </button>
                <button className="px-8 py-3 text-base font-semibold rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  {t("ragSettings.activateExistingToken")}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Features Section */
          <div className="bg-white/90 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-gray-200/40 dark:border-gray-500/30 shadow-lg shadow-gray-200/60 dark:shadow-none">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
              <div className="flex items-center gap-3">
                <Settings2 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {t("ragSettings.features")}
                </h2>
              </div>
              {token && (
                <div className="sm:ml-auto">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                    <Crown className="w-4 h-4" />
                    {token.package.charAt(0).toUpperCase() +
                      token.package.slice(1)}{" "}
                    {t("ragSettings.plan")}
                  </span>
                </div>
              )}
              {featuresLoading || credentialsLoading ? (
                <div className="sm:ml-auto flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {t("common.loading")}
                  </span>
                </div>
              ) : (
                token && (
                  <div className="sm:ml-auto flex items-center gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <span className="text-gray-600 dark:text-gray-300">
                        {t("ragSettings.status.online")} (
                        {
                          getIncludedFeatures().filter((f) =>
                            isFeatureOnline(f)
                          ).length
                        }
                        )
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span className="text-gray-600 dark:text-gray-300">
                        {t("ragSettings.status.offline")} (
                        {
                          getIncludedFeatures().filter(
                            (f) => !isFeatureOnline(f)
                          ).length
                        }
                        )
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>

            {!featuresLoading && !credentialsLoading && token && (
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
                            <span>
                              {t("ragSettings.status.online")} (
                              {group.onlineCount})
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            <span>
                              {t("ragSettings.status.offline")} (
                              {group.totalCount - group.onlineCount})
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Feature Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {group.features.map((feature) => {
                        const isOnline = isFeatureOnline(feature);
                        return (
                          <div
                            key={feature.id}
                            onClick={() => openFeatureModal(feature)}
                            className="p-4 rounded-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-500/30 hover:shadow-lg hover:bg-white/90 dark:hover:bg-gray-800/90 shadow-sm shadow-gray-200/80 dark:shadow-none transition-all duration-200 cursor-pointer hover:scale-[1.02]"
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
                                  {isOnline
                                    ? t("ragSettings.status.online")
                                    : t("ragSettings.status.offline")}
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
                      {t("ragSettings.noFeaturesAvailable")}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      {t("ragSettings.featuresWillAppear")}
                    </p>
                  </div>
                )}
              </div>
            )}

            {featuresLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
                <span className="ml-2 text-gray-600 dark:text-gray-300">
                  {t("ragSettings.loadingFeatures")}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Available Add-ons Section */}
        <div className="bg-white/90 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/40 dark:border-gray-500/30 shadow-lg shadow-gray-200/60 dark:shadow-none">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {t("ragSettings.availableAddons")}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-sm font-medium">
                {getAvailableAddOns().length} {t("ragSettings.available")}
              </span>
              {itemCount > 0 && (
                <button
                  onClick={() => navigate("/cart")}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 border border-blue-500/20"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {t("ragSettings.viewCart")}
                  </span>
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold ml-1">
                    {itemCount}
                  </span>
                </button>
              )}
            </div>
          </div>

          {!featuresLoading ? (
            getAvailableAddOns().length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getAvailableAddOns().map((addon) => {
                  const Icon = getFeatureIcon(addon);
                  const isInCart = items.some(
                    (item) => item.feature.key === addon.key
                  );
                  const pricing =
                    TokenFeatureService.getAddOnPricing()[addon.key];

                  return (
                    <div
                      key={addon.id}
                      className="p-4 rounded-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-500/30 hover:shadow-lg hover:bg-white/90 dark:hover:bg-gray-800/90 shadow-sm shadow-gray-200/80 dark:shadow-none transition-all duration-200"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                          <Icon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {addon.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs font-medium">
                              {addon.category}
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-4">
                        {addon.description || "No description available"}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                            ฿{pricing ? parseInt(pricing.price) : "N/A"}
                          </div>
                          <div className="text-xs text-gray-500">
                            per {pricing?.period || "month"}
                          </div>
                        </div>

                        <button
                          onClick={() => handleAddToCart(addon)}
                          disabled={isInCart}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors text-sm",
                            isInCart
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 cursor-not-allowed"
                              : "bg-purple-600 hover:bg-purple-700 text-white"
                          )}
                        >
                          {isInCart ? (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              In Cart
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4" />
                              Add to Cart
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {t("ragSettings.noAddonsAvailable")}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {token
                    ? t("ragSettings.allAddonsIncluded")
                    : t("ragSettings.activatePlanForAddons")}
                </p>
              </div>
            )
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-300">
                {t("ragSettings.loadingAddons")}
              </span>
            </div>
          )}
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
                    isFeatureOnline(selectedFeature)
                      ? "bg-emerald-100 dark:bg-emerald-900/30"
                      : "bg-red-100 dark:bg-red-900/30"
                  )}
                >
                  <Package
                    className={cn(
                      "w-6 h-6",
                      isFeatureOnline(selectedFeature)
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
                        isFeatureOnline(selectedFeature)
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                      )}
                    >
                      {isFeatureOnline(selectedFeature) ? (
                        <>
                          <Wifi className="w-3 h-3" />
                          {t("ragSettings.status.online")}
                        </>
                      ) : (
                        <>
                          <WifiOff className="w-3 h-3" />
                          {t("ragSettings.status.offline")}
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
                    {t("ragSettings.configurationStatus")}
                  </h3>

                  {userKeys.includes(selectedFeature.key) ? (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/50 dark:border-emerald-500/20 mb-4">
                      <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-emerald-900 dark:text-emerald-200">
                          {t("ragSettings.featureActive")}
                        </div>
                        <div className="text-sm text-emerald-800 dark:text-emerald-300 mt-1">
                          {t("ragSettings.featureActiveDescription")}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-500/20 mb-4">
                        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-medium text-amber-900 dark:text-amber-200">
                            {t("ragSettings.configurationRequired")}
                          </div>
                          <div className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                            {t("ragSettings.configurationRequiredDescription")}
                          </div>
                          {!showCredentialForm && (
                            <button
                              onClick={() => setShowCredentialForm(true)}
                              className="mt-2 text-sm bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white px-3 py-1 rounded-md font-medium transition-colors duration-200"
                            >
                              {t("ragSettings.configureCredentials")}
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
                          {t("ragSettings.credentialsSavedSuccess")}
                        </div>
                        <div className="text-sm text-emerald-800 dark:text-emerald-300 mt-1">
                          {t("ragSettings.featureNowOnline")}
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
                          {t("ragSettings.errorSavingCredentials")}
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
                          {t("ragSettings.accessToken")} *
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
                          placeholder={t("ragSettings.enterAccessToken")}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t("ragSettings.recipientId")} *
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
                          placeholder={t("ragSettings.enterRecipientId")}
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:cursor-not-allowed"
                        >
                          {isSubmitting
                            ? t("ragSettings.saving")
                            : t("ragSettings.saveCredentials")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCredentialForm(false)}
                          className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
                        >
                          {t("common.cancel")}
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
                    "space-y-6",
                    selectedFeature.key !== "rag_files" && "mt-6"
                  )}
                >
                  {/* System Message Configuration */}
                  <div className="p-4 rounded-xl border border-gray-200/30 dark:border-gray-500/20">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                      {t("ragSettings.aiSystemMessage")}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {t("ragSettings.aiSystemMessageDescription")}
                    </p>

                    {/* System Message Success */}
                    {systemMessageSuccess && (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/50 dark:border-emerald-500/20 mb-4">
                        <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-medium text-emerald-900 dark:text-emerald-200">
                            {t("ragSettings.systemMessageUpdated")}
                          </div>
                          <div className="text-sm text-emerald-800 dark:text-emerald-300 mt-1">
                            {t("ragSettings.systemMessageUpdatedDescription")}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* System Message Error */}
                    {systemMessageError && (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200/50 dark:border-red-500/20 mb-4">
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-medium text-red-900 dark:text-red-200">
                            {t("ragSettings.errorUpdatingSystemMessage")}
                          </div>
                          <div className="text-sm text-red-800 dark:text-red-300 mt-1">
                            {systemMessageError}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t("ragSettings.systemMessage")}
                        </label>
                        <textarea
                          value={systemMessage}
                          onChange={(e) => setSystemMessage(e.target.value)}
                          placeholder={t(
                            "ragSettings.systemMessagePlaceholder"
                          )}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 resize-y min-h-[100px]"
                          rows={6}
                          maxLength={5000}
                        />
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {t("ragSettings.charactersCount", {
                            current: systemMessage.length,
                            max: 5000,
                          })}
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {t("ragSettings.systemMessageTip")}
                        </div>
                        <button
                          onClick={handleSystemMessageSave}
                          disabled={
                            isUpdatingSystemMessage || !systemMessage.trim()
                          }
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors duration-200 disabled:cursor-not-allowed"
                        >
                          {isUpdatingSystemMessage ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              {t("ragSettings.saving")}
                            </>
                          ) : (
                            <>
                              <Settings className="w-4 h-4" />
                              {t("ragSettings.saveSystemMessage")}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Document Management */}
                  <div className="p-4 rounded-xl border border-gray-200/30 dark:border-gray-500/20">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                      {t("ragSettings.documentManagement")}
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
                              {uploadProgress?.message ||
                                t("ragSettings.uploading")}
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
                              {t("ragSettings.dropFilesOrClick")}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {t("ragSettings.supportedFormats")}
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
                            {t("ragSettings.chooseFiles")}
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Document List */}
                    {userDocuments.length > 0 && (
                      <div className="mt-6">
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          {t("ragSettings.uploadedDocuments", {
                            count: userDocuments.length,
                          })}
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
                                    {doc.metadata?.originalName ||
                                      t("ragSettings.untitled")}
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
                </div>
              )}
            </div>

            <div className="flex justify-end p-6 border-t border-gray-200/30 dark:border-gray-500/20">
              <button
                onClick={closeFeatureModal}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
              >
                {t("common.close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
