import React from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

interface HowToModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "webhook" | "credential";
  currentPage: "facebook" | "line";
  onPageChange: (page: "facebook" | "line") => void;
}

const HowToModal: React.FC<HowToModalProps> = ({
  isOpen,
  onClose,
  type,
  currentPage,
  onPageChange,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const getContent = () => {
    if (type === "webhook") {
      if (currentPage === "facebook") {
        return {
          title: t("howTo.webhook.facebook.title"),
          image: "/howTo/facebook-webhook.png",
          text: t("howTo.webhook.facebook.text"),
        };
      } else {
        return {
          title: t("howTo.webhook.line.title"),
          image: "/howTo/line-webhook.png",
          text: t("howTo.webhook.line.text"),
        };
      }
    } else {
      if (currentPage === "facebook") {
        return {
          title: t("howTo.credential.facebook.title"),
          image: "/howTo/facebook-credential.png",
          text: t("howTo.credential.facebook.text"),
        };
      } else {
        return {
          title: t("howTo.credential.line.title"),
          image: "/howTo/line-credential.png",
          text: t("howTo.credential.line.text"),
          secondaryImage: "/howTo/line-credential-2.png",
        };
      }
    }
  };

  const content = getContent();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-200/30 dark:border-gray-500/20 shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200/30 dark:border-gray-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <div className="w-6 h-6 text-blue-600 dark:text-blue-400">
                {type === "webhook" ? "🔗" : "🔑"}
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {content.title}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    currentPage === "facebook"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                      : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                  }`}
                >
                  {currentPage === "facebook"
                    ? t("howTo.platforms.facebook")
                    : t("howTo.platforms.line")}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6">
          {/* Platform Switcher */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <button
              onClick={() => onPageChange("facebook")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                currentPage === "facebook"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {currentPage === "facebook" && (
                <ChevronLeft className="w-4 h-4" />
              )}
              {t("howTo.platforms.facebook")}
              {currentPage !== "facebook" && (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
            <button
              onClick={() => onPageChange("line")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                currentPage === "line"
                  ? "bg-green-600 text-white shadow-lg"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {currentPage === "line" && <ChevronLeft className="w-4 h-4" />}
              {t("howTo.platforms.line")}
              {currentPage !== "line" && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>

          {/* Instructions Text */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {t("howTo.instructionsLabel")}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {content.text}
            </p>
          </div>

          {/* Main Image */}
          <div className="mb-6">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
              <img
                src={content.image}
                alt={content.title}
                className="w-full h-auto"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src =
                    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNzUgMTAwSDIyNVYxNTBIMTc1VjEwMFoiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTE1MCAyMDBIMjUwVjIxMEgxNTBWMjAwWiIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNMTc1IDIyMEgyMjVWMjMwSDE3NVYyMjBaIiBmaWxsPSIjOUNBM0FGIi8+Cjx0ZXh0IHg9IjIwMCIgeT0iMjYwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2QjcyODAiPkltYWdlIG5vdCBmb3VuZDwvdGV4dD4KPC9zdmc+";
                }}
              />
            </div>
          </div>

          {/* Secondary Image for LINE Credential */}
          {content.secondaryImage && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                {t("howTo.additionalReference")}
              </h4>
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                <img
                  src={content.secondaryImage}
                  alt={`${content.title} - Additional Reference`}
                  className="w-full h-auto"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src =
                      "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNzUgMTAwSDIyNVYxNTBIMTc1VjEwMFoiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTE1MCAyMDBIMjUwVjIxMEgxNTBWMjAwWiIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNMTc1IDIyMEgyMjVWMjMwSDE3NVYyMjBaIiBmaWxsPSIjOUNBM0FGIi8+Cjx0ZXh0IHg9IjIwMCIgeT0iMjYwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2QjcyODAiPkltYWdlIG5vdCBmb3VuZDwvdGV4dD4KPC9zdmc+";
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end p-6 border-t border-gray-200/30 dark:border-gray-500/20">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
          >
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HowToModal;
