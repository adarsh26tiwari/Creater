"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageIcon, Sparkles, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { generateBlogContent, improveContent } from "@/app/actions/gemini";
import { BarLoader } from "react-spinners";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

if (typeof window !== "undefined") {
  import("react-quill-new/dist/quill.snow.css");
}

const quillConfig = {
  modules: {
    toolbar: {
      container: [
        [{ header: [1, 2, 3, false] }],
        [{ size: ["small", false, "large", "huge"] }],
        ["bold", "italic", "underline", "strike"],
        [{ color: [] }, { background: [] }],
        [{ align: [] }],
        ["link", "blockquote", "code-block"],
        [
          { list: "ordered" },
          { list: "bullet" },
          { indent: "-1" },
          { indent: "+1" },
        ],
        ["image", "video"],
      ],
      handlers: { image: function () {} },
    },
  },
  formats: [
    "header",
    "size",
    "bold",
    "italic",
    "underline",
    "strike",
    "color",
    "background",
    "align",
    "link",
    "blockquote",
    "code-block",
    "list",
    "indent",
    "image",
    "video",
  ],
};

export default function PostEditorContent({
  form,
  setQuillRef,
  onImageUpload,
}) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const watchedValues = watch();
  const [isLoading, setIsLoading] = useState(false);

  const getQuillModules = () => ({
    ...quillConfig.modules,
    toolbar: {
      ...quillConfig.modules.toolbar,
      handlers: { image: () => onImageUpload("content") },
    },
  });

  const getRealContent = (content) => {
    if (!content) return "";
    return content.replace(/<[^>]*>/g, "").trim();
  };

  const handleAI = async (type) => {
    const { title, content, category, tags } = watchedValues;
    const hasRealContent = getRealContent(content).length > 10;

    if (!title?.trim()) {
      return toast.error("Please add a title first");
    }

    setIsLoading(true);

    try {
      if (type === "enhance") {
        // ✅ Always generates fresh content from title
        const result = await generateBlogContent(title, category, tags || []);
        if (result.success) {
          setValue("content", result.content);
          toast.success("Content generated successfully!");
        } else {
          toast.error(result.error);
        }

      } else if (type === "expand") {
        if (!hasRealContent) {
          // No content → generate first then expand
          const generated = await generateBlogContent(title, category, tags || []);
          if (!generated.success) return toast.error(generated.error);
          const expanded = await improveContent(generated.content, "expand");
          if (expanded.success) {
            setValue("content", expanded.content);
            toast.success("Content generated and expanded successfully!");
          } else {
            toast.error(expanded.error);
          }
        } else {
          // Has content → just expand
          const result = await improveContent(content, "expand");
          if (result.success) {
            setValue("content", result.content);
            toast.success("Content expanded successfully!");
          } else {
            toast.error(result.error);
          }
        }

      } else if (type === "simplify") {
        if (!hasRealContent) {
          // No content → generate first then simplify
          const generated = await generateBlogContent(title, category, tags || []);
          if (!generated.success) return toast.error(generated.error);
          const simplified = await improveContent(generated.content, "simplify");
          if (simplified.success) {
            setValue("content", simplified.content);
            toast.success("Content generated and simplified successfully!");
          } else {
            toast.error(simplified.error);
          }
        } else {
          // Has content → just simplify
          const result = await improveContent(content, "simplify");
          if (result.success) {
            setValue("content", result.content);
            toast.success("Content simplified successfully!");
          } else {
            toast.error(result.error);
          }
        }
      }

    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const hasTitle = watchedValues.title?.trim();

  return (
    <>
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-5">

          {/* Featured Image */}
          {watchedValues.featuredImage ? (
            <div className="relative group">
              <img
                src={watchedValues.featuredImage}
                alt="Featured"
                className="w-full h-80 object-cover rounded-xl"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center space-x-3">
                <Button
                  onClick={() => onImageUpload("featured")}
                  variant="secondary"
                  size="sm"
                >
                  Change Image
                </Button>
                <Button
                  onClick={() => setValue("featuredImage", "")}
                  variant="destructive"
                  size="sm"
                >
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => onImageUpload("featured")}
              className="w-full h-36 border-2 border-dashed border-slate-600 rounded-xl flex flex-col items-center justify-center space-y-4 hover:border-slate-500 transition-colors group"
            >
              <ImageIcon className="h-12 w-12 text-slate-400 group-hover:text-slate-300" />
              <div className="text-center">
                <p className="text-slate-300 text-lg font-medium">
                  Add a featured image
                </p>
                <p className="text-slate-500 text-sm mt-1">
                  Upload and transform with AI
                </p>
              </div>
            </button>
          )}

          {/* Title */}
          <div>
            <Input
              {...register("title")}
              placeholder="Post title..."
              className="border-0 text-4xl font-bold bg-transparent placeholder:text-slate-500 text-white p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
              style={{ fontSize: "2.5rem", lineHeight: "1.2" }}
            />
            {errors.title && (
              <p className="text-red-400 mt-2">{errors.title.message}</p>
            )}
          </div>

          {/* AI Tools - always visible when title exists */}
          <div className="space-y-2">
            <div className="grid grid-cols-3 w-full gap-2">
              <Button
                onClick={() => handleAI("enhance")}
                disabled={!hasTitle || isLoading}
                variant="outline"
                size="sm"
                className="border-green-500 text-green-400 hover:bg-green-500 hover:text-white disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                AI Enhance
              </Button>
              <Button
                onClick={() => handleAI("expand")}
                disabled={!hasTitle || isLoading}
                variant="outline"
                size="sm"
                className="border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white disabled:opacity-50"
              >
                <Plus className="h-4 w-4 mr-2" />
                AI Expand
              </Button>
              <Button
                onClick={() => handleAI("simplify")}
                disabled={!hasTitle || isLoading}
                variant="outline"
                size="sm"
                className="border-orange-500 text-orange-400 hover:bg-orange-500 hover:text-white disabled:opacity-50"
              >
                <Minus className="h-4 w-4 mr-2" />
                AI Simplify
              </Button>
            </div>
            {!hasTitle && (
              <p className="text-xs text-slate-400 w-full pt-1">
                Add a title to enable AI content generation
              </p>
            )}
          </div>

          {isLoading && (
            <BarLoader width={"95%"} color="#D8B4FE" />
          )}

          {/* Editor */}
          <div className="prose prose-lg max-w-none">
            <ReactQuill
              ref={setQuillRef}
              theme="snow"
              value={watchedValues.content}
              onChange={(content) => setValue("content", content)}
              modules={getQuillModules()}
              formats={quillConfig.formats}
              placeholder="Tell your story... or use AI to generate content!"
              style={{
                minHeight: "400px",
                fontSize: "1.125rem",
                lineHeight: "1.7",
              }}
            />
            {errors.content && (
              <p className="text-red-400 mt-2">{errors.content.message}</p>
            )}
          </div>
        </div>
      </main>

      <style jsx global>{`
        .ql-editor {
          color: white !important;
          font-size: 1.125rem !important;
          line-height: 1.7 !important;
          padding: 0 !important;
          min-height: 400px !important;
        }
        .ql-editor::before {
          color: rgb(100, 116, 139) !important;
        }
        .ql-toolbar {
          border: none !important;
          padding: 0 0 1rem 0 !important;
          position: sticky !important;
          top: 80px !important;
          background: rgb(15, 23, 42) !important;
          z-index: 30 !important;
          border-radius: 8px !important;
          margin-bottom: 1rem !important;
        }
        .ql-container {
          border: none !important;
        }
        .ql-snow .ql-tooltip {
          background: rgb(30, 41, 59) !important;
          border: 1px solid rgb(71, 85, 105) !important;
          color: white !important;
        }
        .ql-snow .ql-picker {
          color: white !important;
        }
        .ql-snow .ql-picker-options {
          background: rgb(30, 41, 59) !important;
          border: 1px solid rgb(71, 85, 105) !important;
        }
        .ql-snow .ql-fill,
        .ql-snow .ql-stroke.ql-fill {
          fill: white !important;
        }
        .ql-snow .ql-stroke {
          stroke: white !important;
        }
        .ql-editor h2 {
          font-size: 2rem !important;
          font-weight: 600 !important;
          color: white !important;
        }
        .ql-editor h3 {
          font-size: 1.5rem !important;
          font-weight: 600 !important;
          color: white !important;
        }
        .ql-editor blockquote {
          border-left: 4px solid rgb(147, 51, 234) !important;
          color: rgb(203, 213, 225) !important;
          padding-left: 1rem !important;
          font-style: italic !important;
        }
        .ql-editor a {
          color: rgb(147, 51, 234) !important;
        }
        .ql-editor code {
          background: rgb(51, 65, 85) !important;
          color: rgb(248, 113, 113) !important;
          padding: 0.125rem 0.25rem !important;
          border-radius: 0.25rem !important;
        }
      `}</style>
    </>
  );
}