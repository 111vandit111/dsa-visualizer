"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteQuestion } from "@/lib/api/client";
import type { QuestionSummary } from "@/lib/types/question";
import { useUnauthorizedRedirect } from "./use-unauthorized-redirect";

interface DeleteQuestionDialogProps {
  question: QuestionSummary | null;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteQuestionDialog({ question, onClose, onDeleted }: DeleteQuestionDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const redirectIfUnauthorized = useUnauthorizedRedirect();

  const handleConfirm = async () => {
    if (!question) return;
    setIsDeleting(true);
    try {
      await deleteQuestion(question.slug);
      toast.success(`Deleted "${question.title}"`);
      onDeleted();
    } catch (error) {
      if (!redirectIfUnauthorized(error)) {
        toast.error(error instanceof Error ? error.message : "Could not delete the question");
      }
    } finally {
      setIsDeleting(false);
      onClose();
    }
  };

  return (
    <AlertDialog open={question !== null} onOpenChange={(isOpen) => !isOpen && !isDeleting && onClose()}>
      <AlertDialogContent className="max-h-[85dvh] max-w-[calc(100%-2rem)] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display">Delete this question?</AlertDialogTitle>
          <AlertDialogDescription className="[overflow-wrap:anywhere]">
            &ldquo;{question?.title}&rdquo; and its test cases will be permanently removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            data-testid="admin-delete-confirm"
            disabled={isDeleting}
            onClick={handleConfirm}
          >
            {isDeleting ? <Loader2Icon className="animate-spin" data-icon="inline-start" /> : null}
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
